export type AvailabilityAction = "book" | "waitlist";

export interface AvailabilitySearchInput {
  /**
   * Venue slug used by SevenRooms reservation URLs, e.g. "myrestaurant".
   */
  venueSlug: string;
  /**
   * Optional full reservation widget URL, useful when SevenRooms embeds are hosted elsewhere.
   */
  entryUrl?: string;
  /**
   * Party size requested for the search.
   */
  partySize: number;
  /**
   * ISO-8601 date string, e.g. "2025-01-19".
   */
  date: string;
  /**
   * Optional time hint in 24h "HH:mm" format. When omitted SevenRooms will return the default grid.
   */
  time?: string;
  /**
   * SevenRooms "experience" or seating tag when the venue offers multiple options.
   */
  experience?: string;
  /**
    * Optional location code for concepts that operate in multiple cities.
    */
  location?: string;
  /**
   * Additional request metadata passed through to downstream tooling.
   */
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface AvailabilitySlot {
  id: string;
  label: string;
  isoDateTime?: string;
  action: AvailabilityAction;
  experience?: string;
  depositRequired?: boolean;
  rawText?: string;
  attributes?: Record<string, string | null>;
}

export interface AvailabilityResult {
  query: AvailabilitySearchInput;
  slots: AvailabilitySlot[];
  scrapedAt: string;
}

export interface GuestProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  /**
   * ISO country code (e.g. "US") used by the native SevenRooms dropdown.
   */
  countryCode?: string;
  marketingOptIn?: boolean;
  specialRequests?: string;
}

export interface PaymentDetails {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  postalCode?: string;
  nameOnCard?: string;
}

export interface BookingRequest {
  /**
   * Label or DOM id of the desired slot. When omitted, the first slot will be used.
   */
  slotLabelOrId?: string;
  search: AvailabilitySearchInput;
  guest: GuestProfile;
  payment?: PaymentDetails;
  /**
   * Whether the automation should stay on the confirmation screen until manually cancelled.
   */
  stayOnPage?: boolean;
}

export interface BookingResponse {
  status: "confirmed" | "waitlisted" | "unknown";
  confirmationCode?: string;
  slot?: AvailabilitySlot;
  screenshotPath?: string;
  submittedAt: string;
}

export interface DomSelectors {
  dateInput: string[];
  timeDropdown: string[];
  partyInput: string[];
  partyIncrement: string[];
  partyDecrement: string[];
  experienceDropdown: string[];
  availabilityContainer: string[];
  availabilityButton: string[];
  loadingSpinner: string[];
  continueButton: string[];
  waitlistButton: string[];
  firstNameInput: string[];
  lastNameInput: string[];
  emailInput: string[];
  phoneInput: string[];
  countrySelect: string[];
  marketingCheckbox: string[];
  notesTextarea: string[];
  submitButton: string[];
  confirmationCode: string[];
  paymentCardNumber: string[];
  paymentExpiry: string[];
  paymentCvc: string[];
  paymentPostalCode: string[];
  paymentName: string[];
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface SevenRoomsScraperOptions {
  headless?: boolean;
  slowMoMs?: number;
  navigationTimeoutMs?: number;
  screenshotDir?: string;
  selectors?: Partial<DomSelectors>;
  userAgent?: string;
  debug?: boolean;
  logger?: Logger;
}
