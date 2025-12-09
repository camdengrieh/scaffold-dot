import fs from "node:fs/promises";
import path from "node:path";

import { Browser, BrowserContext, chromium, Locator, Page } from "playwright";
import { z } from "zod";

import { AvailabilityError, BookingError } from "./errors";
import { resolveLogger } from "./logger";
import type {
  AvailabilityResult,
  AvailabilitySearchInput,
  AvailabilitySlot,
  BookingRequest,
  BookingResponse,
  DomSelectors,
  Logger,
  SevenRoomsScraperOptions,
} from "./types";

const DEFAULT_WIDGET_BASE = "https://www.sevenrooms.com/reservations";
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const availabilitySchema = z.object({
  venueSlug: z.string().min(1, "venueSlug is required"),
  entryUrl: z.string().url().optional(),
  partySize: z.number().int().min(1).max(20),
  date: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), "date must be ISO-8601 compliant"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "time must be 24h HH:mm")
    .optional(),
  experience: z.string().optional(),
  location: z.string().optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const bookingSchema = z.object({
  slotLabelOrId: z.string().optional(),
  search: availabilitySchema,
  guest: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phoneNumber: z.string().min(6),
    countryCode: z.string().optional(),
    marketingOptIn: z.boolean().optional(),
    specialRequests: z.string().optional(),
  }),
  payment: z
    .object({
      cardNumber: z.string().min(8),
      expiryMonth: z.string().min(1),
      expiryYear: z.string().min(2),
      cvc: z.string().min(3),
      postalCode: z.string().optional(),
      nameOnCard: z.string().optional(),
    })
    .optional(),
  stayOnPage: z.boolean().optional(),
});

const DEFAULT_SELECTORS: DomSelectors = {
  dateInput: ['input[name="date"]', 'input[data-testid="date-input"]', 'input[type="date"]'],
  timeDropdown: ['select[name="time"]', '[data-testid="time-select"] select'],
  partyInput: ['input[name="partySize"]', '[data-testid="party-size-input"] input'],
  partyIncrement: [
    'button[data-testid="guest-stepper-increment"]',
    'button[aria-label="Increase party size"]',
  ],
  partyDecrement: [
    'button[data-testid="guest-stepper-decrement"]',
    'button[aria-label="Decrease party size"]',
  ],
  experienceDropdown: ['select[name="experience"]', '[data-testid="experience-select"] select'],
  availabilityContainer: [
    '[data-testid="availability-list"]',
    '[data-testid="availability-results"]',
    '[data-testid="available-times"]',
  ],
  availabilityButton: [
    '[data-testid="availability-list"] button',
    '[data-testid="availability-results"] button',
    '[data-testid="available-times"] button',
    'button[data-testid="availability-button"]',
  ],
  loadingSpinner: ['[data-testid="availability-loading"]', '[data-testid="loading-indicator"]'],
  continueButton: ['button[data-testid="continue-button"]', 'button:has-text("Continue")'],
  waitlistButton: ['button:has-text("Join Waitlist")'],
  firstNameInput: ['input[name="firstName"]', 'input#first_name'],
  lastNameInput: ['input[name="lastName"]', 'input#last_name'],
  emailInput: ['input[name="email"]', 'input[type="email"]'],
  phoneInput: ['input[name="phone"]', 'input[type="tel"]'],
  countrySelect: ['select[name="countryCode"]', '[data-testid="country-select"] select'],
  marketingCheckbox: ['input[name="marketingOptIn"]', 'input#marketing_opt_in'],
  notesTextarea: ['textarea[name="notes"]', '#notes'],
  submitButton: [
    'button[type="submit"]',
    'button:has-text("Complete Reservation")',
    'button:has-text("Request Reservation")',
  ],
  confirmationCode: [
    '[data-testid="confirmation-code"]',
    '[data-testid="reservation-code"]',
    '[class*="confirmation"] strong',
  ],
  paymentCardNumber: ['input[name="cardNumber"]', 'input[autocomplete="cc-number"]'],
  paymentExpiry: ['input[name="cardExpiry"]', 'input[autocomplete="cc-exp"]'],
  paymentCvc: ['input[name="cardCvc"]', 'input[autocomplete="cc-csc"]'],
  paymentPostalCode: ['input[name="postalCode"]', 'input[autocomplete="cc-postal-code"]'],
  paymentName: ['input[name="nameOnCard"]', 'input[autocomplete="cc-name"]'],
};

type WaitForOptions = Parameters<Page["waitForSelector"]>[1];

interface RawSlot {
  label: string;
  dataset: Record<string, string>;
  attributes: Record<string, string | null>;
}

const mergeSelectors = (overrides?: Partial<DomSelectors>): DomSelectors => {
  const result: Partial<DomSelectors> = {};
  const keys = Object.keys(DEFAULT_SELECTORS) as (keyof DomSelectors)[];
  for (const key of keys) {
    const base = DEFAULT_SELECTORS[key];
    const override = overrides?.[key];
    result[key] = override && override.length ? [...override] : [...base];
  }
  return result as DomSelectors;
};

export class SevenRoomsScraper {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private readonly selectors: DomSelectors;
  private readonly config: SevenRoomsScraperOptions & { navigationTimeoutMs: number };
  private readonly logger: Logger;

  constructor(private readonly options: SevenRoomsScraperOptions = {}) {
    this.config = {
      headless: options.headless ?? true,
      slowMoMs: options.slowMoMs,
      navigationTimeoutMs: options.navigationTimeoutMs ?? 60_000,
      screenshotDir: options.screenshotDir,
      selectors: options.selectors,
      userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
      debug: options.debug,
    };
    this.selectors = mergeSelectors(options.selectors);
    this.logger = resolveLogger(options.logger, options.debug ?? process.env.DEBUG_SEVENROOMS === "1");
  }

  async init(): Promise<void> {
    await this.ensurePage();
  }

  async close(): Promise<void> {
    await this.page?.close().catch(() => undefined);
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    this.page = undefined;
    this.context = undefined;
    this.browser = undefined;
  }

  async searchAvailability(input: AvailabilitySearchInput): Promise<AvailabilityResult> {
    const query = availabilitySchema.parse(input);
    const page = await this.ensurePage();

    const url = this.buildEntryUrl(query);
    this.logger.info(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: this.config.navigationTimeoutMs });

    await this.applySearchFilters(query);
    await this.waitForAvailabilityGrid();
    const slots = await this.extractSlots(query);

    return {
      query,
      slots,
      scrapedAt: new Date().toISOString(),
    };
  }

  async book(request: BookingRequest): Promise<BookingResponse> {
    const parsed = bookingSchema.parse(request);
    const availability = await this.searchAvailability(parsed.search);

    if (availability.slots.length === 0) {
      throw new BookingError("No availability slots returned for booking");
    }

    const targetSlot =
      availability.slots.find(
        (slot) => slot.id === parsed.slotLabelOrId || slot.label === parsed.slotLabelOrId,
      ) ?? availability.slots[0];

    await this.selectSlot(targetSlot);
    await this.fillBookingForm(parsed);
    await this.submitBooking();

    const confirmation = await this.captureConfirmation(targetSlot);

    if (!parsed.stayOnPage) {
      await this.close();
    }

    return confirmation;
  }

  private buildEntryUrl(query: AvailabilitySearchInput): string {
    if (query.entryUrl) {
      return query.entryUrl;
    }
    const params = new URLSearchParams();
    if (query.location) {
      params.set("location", query.location);
    }
    if (query.experience) {
      params.set("experience", query.experience);
    }
    const suffix = params.size > 0 ? `?${params.toString()}` : "";
    return `${DEFAULT_WIDGET_BASE}/${query.venueSlug}${suffix}`;
  }

  private async ensurePage(): Promise<Page> {
    if (this.page) {
      return this.page;
    }
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMoMs,
    });
    this.context = await this.browser.newContext({
      userAgent: this.config.userAgent ?? DEFAULT_USER_AGENT,
      viewport: { width: 1280, height: 720 },
    });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.navigationTimeoutMs);
    this.page.setDefaultNavigationTimeout(this.config.navigationTimeoutMs);
    return this.page;
  }

  private async applySearchFilters(query: AvailabilitySearchInput): Promise<void> {
    await this.setPartySize(query.partySize);
    await this.setDate(query.date);
    if (query.time) {
      await this.setTime(query.time);
    }
    if (query.experience) {
      await this.setExperience(query.experience);
    }
  }

  private async waitForAvailabilityGrid(): Promise<void> {
    const spinner = await this.findFirstLocator(this.selectors.loadingSpinner, { visible: false });
    if (spinner) {
      await spinner.waitFor({ state: "detached", timeout: this.config.navigationTimeoutMs }).catch(() => undefined);
    }
    await this.waitForAnySelector(this.selectors.availabilityContainer, {
      state: "visible",
      timeout: this.config.navigationTimeoutMs,
    });
  }

  private async extractSlots(query: AvailabilitySearchInput): Promise<AvailabilitySlot[]> {
    const page = await this.ensurePage();

    for (const selector of this.selectors.availabilityButton) {
      const buttonCount = await page.locator(selector).count();
      if (buttonCount === 0) {
        continue;
      }
      const rawSlots = await page.$$eval(selector, (buttons) =>
        buttons.map((button) => ({
          label: (button.textContent ?? "").trim(),
          dataset: { ...(button as HTMLElement).dataset },
          attributes: Object.fromEntries(Array.from(button.attributes).map((attr) => [attr.name, attr.value])),
        })),
      );
      if (rawSlots.length > 0) {
        return rawSlots.map((slot, index) => this.normalizeSlot(slot as RawSlot, query, index));
      }
    }

    this.logger.warn("No availability slots were found with the provided selectors");
    return [];
  }

  private normalizeSlot(slot: RawSlot, query: AvailabilitySearchInput, index: number): AvailabilitySlot {
    const candidateId =
      slot.dataset["availabilityId"] ??
      slot.dataset["id"] ??
      slot.attributes["data-availability-id"] ??
      `slot-${index}`;
    const action = slot.dataset["action"] === "waitlist" ? "waitlist" : "book";
    return {
      id: candidateId,
      label: slot.label,
      action,
      experience: slot.dataset["experience"] ?? query.experience,
      depositRequired: slot.dataset["depositRequired"] === "true",
      rawText: slot.label,
      attributes: slot.attributes,
      isoDateTime: this.combineDateTime(query.date, slot.label),
    };
  }

  private combineDateTime(date: string, label?: string): string | undefined {
    if (!label) {
      return undefined;
    }
    const match = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) {
      return undefined;
    }
    let hour = Number(match[1]);
    const minutes = match[2];
    const suffix = match[3]?.toUpperCase();
    if (suffix === "PM" && hour < 12) {
      hour += 12;
    } else if (suffix === "AM" && hour === 12) {
      hour = 0;
    }
    const hh = String(hour).padStart(2, "0");
    return `${date}T${hh}:${minutes}:00`;
  }

  private async selectSlot(slot: AvailabilitySlot): Promise<void> {
    const page = await this.ensurePage();
    for (const selector of this.selectors.availabilityButton) {
      const byId = page.locator(`${selector}[data-availability-id="${slot.id}"]`);
      if ((await byId.count()) > 0) {
        await byId.first().click();
        return;
      }
      const byText = page.locator(selector, { hasText: slot.label });
      if ((await byText.count()) > 0) {
        await byText.first().click();
        return;
      }
    }
    throw new BookingError(`Unable to click booking slot "${slot.label}"`);
  }

  private async fillBookingForm(request: z.infer<typeof bookingSchema>): Promise<void> {
    const { guest, payment } = request;
    await this.fillFirstMatchingInput(this.selectors.firstNameInput, guest.firstName);
    await this.fillFirstMatchingInput(this.selectors.lastNameInput, guest.lastName);
    await this.fillFirstMatchingInput(this.selectors.emailInput, guest.email);
    await this.fillFirstMatchingInput(this.selectors.phoneInput, guest.phoneNumber);

    if (guest.countryCode) {
      const countrySelector = await this.findFirstLocator(this.selectors.countrySelect);
      await countrySelector?.selectOption(guest.countryCode);
    }

    if (guest.specialRequests) {
      await this.fillFirstMatchingInput(this.selectors.notesTextarea, guest.specialRequests);
    }

    if (typeof guest.marketingOptIn === "boolean") {
      await this.setCheckbox(this.selectors.marketingCheckbox, guest.marketingOptIn);
    }

    if (payment) {
      const expiryValue = `${payment.expiryMonth}/${payment.expiryYear}`;
      await this.fillFirstMatchingInput(
        this.selectors.paymentName,
        payment.nameOnCard ?? `${guest.firstName} ${guest.lastName}`,
      );
      await this.fillFirstMatchingInput(this.selectors.paymentCardNumber, payment.cardNumber);
      await this.fillFirstMatchingInput(this.selectors.paymentExpiry, expiryValue);
      await this.fillFirstMatchingInput(this.selectors.paymentCvc, payment.cvc);
      if (payment.postalCode) {
        await this.fillFirstMatchingInput(this.selectors.paymentPostalCode, payment.postalCode);
      }
    }
  }

  private async submitBooking(): Promise<void> {
    const submitButton = await this.findFirstLocator(this.selectors.submitButton);
    if (!submitButton) {
      throw new BookingError("Unable to locate booking submit button");
    }
    await submitButton.click();
  }

  private async captureConfirmation(slot: AvailabilitySlot): Promise<BookingResponse> {
    const page = await this.ensurePage();
    let confirmationCode: string | undefined;
    const confirmationLocator = await this.waitForAnySelector(this.selectors.confirmationCode, {
      state: "visible",
      timeout: this.config.navigationTimeoutMs,
      strict: false,
    }).catch(() => null);

    if (confirmationLocator) {
      confirmationCode = (await confirmationLocator.innerText()).trim();
    }

    const screenshotPath = await this.takeScreenshot(
      confirmationCode ? `confirmation-${confirmationCode}` : "confirmation",
    );

    return {
      status: confirmationCode ? "confirmed" : "unknown",
      confirmationCode: confirmationCode ?? undefined,
      submittedAt: new Date().toISOString(),
      screenshotPath,
      slot,
    };
  }

  private async takeScreenshot(name: string): Promise<string | undefined> {
    if (!this.config.screenshotDir) {
      return undefined;
    }
    const page = await this.ensurePage();
    await fs.mkdir(this.config.screenshotDir, { recursive: true });
    const filePath = path.join(this.config.screenshotDir, `${name}-${Date.now()}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
  }

  private async setPartySize(count: number): Promise<void> {
    const input = await this.findFirstLocator(this.selectors.partyInput);
    if (input) {
      await input.fill("");
      await input.type(String(count));
      await input.press("Enter");
      return;
    }

    const increment = await this.findFirstLocator(this.selectors.partyIncrement);
    const decrement = await this.findFirstLocator(this.selectors.partyDecrement);
    if (!increment || !decrement) {
      this.logger.warn("Party size controls not found; leaving default party size supplied by widget");
      return;
    }
    for (let i = 0; i < 10; i += 1) {
      await decrement.click().catch(() => undefined);
    }
    for (let i = 1; i < count; i += 1) {
      await increment.click();
    }
  }

  private async setDate(date: string): Promise<void> {
    const input = await this.findFirstLocator(this.selectors.dateInput);
    if (!input) {
      this.logger.warn("Date input selector not found, skipping date override");
      return;
    }
    await input.fill("");
    await input.type(date);
    await input.press("Enter");
  }

  private async setTime(time: string): Promise<void> {
    const dropdown = await this.findFirstLocator(this.selectors.timeDropdown, { visible: false });
    if (!dropdown) {
      this.logger.warn("Time dropdown not found, defaulting to SevenRooms suggestions");
      return;
    }
    await dropdown.selectOption({ label: time }).catch(async () => {
      await dropdown.selectOption(time).catch(() => undefined);
    });
  }

  private async setExperience(experience: string): Promise<void> {
    const dropdown = await this.findFirstLocator(this.selectors.experienceDropdown, { visible: false });
    if (!dropdown) {
      this.logger.warn("Experience dropdown not found; continuing with default experience");
      return;
    }
    await dropdown.selectOption({ label: experience }).catch(async () => {
      await dropdown.selectOption(experience).catch(() => undefined);
    });
  }

  private async findFirstLocator(
    selectors: string[],
    waitOptions?: { visible?: boolean },
  ): Promise<Locator | null> {
    const page = await this.ensurePage();
    for (const selector of selectors) {
      const locator = page.locator(selector);
      if ((await locator.count()) > 0) {
        if (waitOptions?.visible !== false) {
          try {
            await locator.first().waitFor({ state: "visible", timeout: 1_000 });
          } catch {
            continue;
          }
        }
        return locator.first();
      }
    }
    return null;
  }

  private async waitForAnySelector(
    selectors: string[],
    options: WaitForOptions,
  ): Promise<Locator> {
    const page = await this.ensurePage();
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, options);
        return page.locator(selector);
      } catch {
        // try next selector
      }
    }
    throw new AvailabilityError(`None of the selectors matched: ${selectors.join(", ")}`);
  }

  private async fillFirstMatchingInput(selectors: string[], value?: string): Promise<void> {
    if (!value) {
      return;
    }
    const locator = await this.findFirstLocator(selectors);
    if (!locator) {
      this.logger.warn(`Skipping input, selectors not found: ${selectors.join(", ")}`);
      return;
    }
    await locator.fill("");
    await locator.type(value);
  }

  private async setCheckbox(selectors: string[], checked: boolean): Promise<void> {
    const locator = await this.findFirstLocator(selectors, { visible: false });
    if (!locator) {
      this.logger.warn(`Checkbox selectors not found: ${selectors.join(", ")}`);
      return;
    }
    const current = await locator.isChecked();
    if (current !== checked) {
      await locator.setChecked(checked);
    }
  }
}
