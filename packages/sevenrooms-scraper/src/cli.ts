#!/usr/bin/env node
import "dotenv/config";
import { Command, Option } from "commander";

import { SevenRoomsScraper } from "./SevenRoomsScraper";
import type { BookingRequest, SevenRoomsScraperOptions } from "./types";

const program = new Command()
  .name("sevenrooms")
  .description("Search and book SevenRooms reservations headlessly with Playwright.")
  .option("--headful", "Run the browser in headed mode", false)
  .addOption(new Option("--slow-mo <ms>", "Add Playwright slow motion in ms").argParser(Number))
  .option("--debug", "Enable verbose console logging", false)
  .addOption(new Option("--screenshot-dir <path>", "Capture screenshots in this directory"));

const resolveScraperOptions = (command: Command): SevenRoomsScraperOptions => {
  const opts = command.optsWithGlobals<Record<string, unknown>>();
  return {
    headless: !opts.headful,
    slowMoMs: typeof opts.slowMo === "number" ? opts.slowMo : undefined,
    debug: Boolean(opts.debug),
    screenshotDir: typeof opts.screenshotDir === "string" ? opts.screenshotDir : undefined,
  };
};

program
  .command("search")
  .requiredOption("-v, --venue <slug>", "SevenRooms venue slug")
  .requiredOption("-d, --date <YYYY-MM-DD>", "Reservation date")
  .addOption(new Option("-p, --party <size>", "Party size").default(2).argParser((value) => Number(value)))
  .option("-t, --time <HH:mm>", "24h time hint")
  .option("-e, --experience <name>", "Experience filter")
  .option("-l, --location <code>", "Location code for multi-city groups")
  .option("--entry-url <url>", "Full SevenRooms widget URL override")
  .action(async (options, command) => {
    const scraper = new SevenRoomsScraper(resolveScraperOptions(command));
    try {
      await scraper.init();
      const result = await scraper.searchAvailability({
        venueSlug: options.venue,
        date: options.date,
        partySize: options.party,
        time: options.time,
        experience: options.experience,
        location: options.location,
        entryUrl: options.entryUrl,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error("Search failed:", error);
      process.exitCode = 1;
    } finally {
      await scraper.close();
    }
  });

program
  .command("book")
  .requiredOption("-v, --venue <slug>", "SevenRooms venue slug")
  .requiredOption("-d, --date <YYYY-MM-DD>", "Reservation date")
  .addOption(new Option("-p, --party <size>", "Party size").default(2).argParser((value) => Number(value)))
  .option("-t, --time <HH:mm>", "Time slot preference")
  .option("-e, --experience <name>", "Experience filter")
  .option("-l, --location <code>", "Location code")
  .option("--entry-url <url>", "Full SevenRooms widget URL override")
  .option("--slot <labelOrId>", "Slot label or DOM data-availability-id to click")
  .option("--stay-on-page", "Keep the confirmation page open after submitting", false)
  .option("--first-name <value>", "Guest first name", process.env.SEVENROOMS_FIRST_NAME)
  .option("--last-name <value>", "Guest last name", process.env.SEVENROOMS_LAST_NAME)
  .option("--email <value>", "Guest email", process.env.SEVENROOMS_EMAIL)
  .option("--phone <value>", "Guest phone number", process.env.SEVENROOMS_PHONE)
  .option("--country <ISO>", "Guest country code", process.env.SEVENROOMS_COUNTRY)
  .option("--notes <value>", "Special requests / notes", process.env.SEVENROOMS_NOTES)
  .addOption(
    new Option("--marketing <true|false>", "Marketing opt-in toggle")
      .choices(["true", "false"])
      .default(process.env.SEVENROOMS_MARKETING_OPT_IN),
  )
  .option("--card-number <value>", "Payment card number", process.env.SEVENROOMS_CARD_NUMBER)
  .option("--card-exp-month <value>", "Payment expiry month", process.env.SEVENROOMS_CARD_EXP_MONTH)
  .option("--card-exp-year <value>", "Payment expiry year", process.env.SEVENROOMS_CARD_EXP_YEAR)
  .option("--card-cvc <value>", "Payment CVC", process.env.SEVENROOMS_CARD_CVC)
  .option("--card-postal <value>", "Billing postal code", process.env.SEVENROOMS_CARD_POSTAL)
  .option("--card-name <value>", "Name on card", process.env.SEVENROOMS_CARD_NAME)
  .action(async (options, command) => {
    const scraper = new SevenRoomsScraper(resolveScraperOptions(command));
    try {
      await scraper.init();
      const bookingRequest = buildBookingRequest(options);
      const response = await scraper.book(bookingRequest);
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error("Booking failed:", error);
      process.exitCode = 1;
    } finally {
      await scraper.close();
    }
  });

const buildBookingRequest = (options: Record<string, any>): BookingRequest => {
  const marketing =
    typeof options.marketing === "string"
      ? options.marketing === "true"
      : process.env.SEVENROOMS_MARKETING_OPT_IN === "true"
        ? true
        : process.env.SEVENROOMS_MARKETING_OPT_IN === "false"
          ? false
          : undefined;

  const guest = {
    firstName: options.firstName ?? process.env.SEVENROOMS_FIRST_NAME,
    lastName: options.lastName ?? process.env.SEVENROOMS_LAST_NAME,
    email: options.email ?? process.env.SEVENROOMS_EMAIL,
    phoneNumber: options.phone ?? process.env.SEVENROOMS_PHONE,
    countryCode: options.country ?? process.env.SEVENROOMS_COUNTRY,
    specialRequests: options.notes ?? process.env.SEVENROOMS_NOTES,
    marketingOptIn: marketing,
  };

  if (!guest.firstName || !guest.lastName || !guest.email || !guest.phoneNumber) {
    throw new Error("Guest firstName, lastName, email, and phone are required for booking.");
  }

  const payment =
    options.cardNumber || process.env.SEVENROOMS_CARD_NUMBER
      ? {
          cardNumber: options.cardNumber ?? process.env.SEVENROOMS_CARD_NUMBER,
          expiryMonth: options.cardExpMonth ?? process.env.SEVENROOMS_CARD_EXP_MONTH,
          expiryYear: options.cardExpYear ?? process.env.SEVENROOMS_CARD_EXP_YEAR,
          cvc: options.cardCvc ?? process.env.SEVENROOMS_CARD_CVC,
          postalCode: options.cardPostal ?? process.env.SEVENROOMS_CARD_POSTAL,
          nameOnCard: options.cardName ?? process.env.SEVENROOMS_CARD_NAME,
        }
      : undefined;

  if (payment) {
    if (!payment.expiryMonth || !payment.expiryYear || !payment.cvc) {
      throw new Error("Card expiry month, year, and CVC are required when supplying a card.");
    }
  }

  return {
    slotLabelOrId: options.slot,
    stayOnPage: Boolean(options.stayOnPage),
    search: {
      venueSlug: options.venue,
      date: options.date,
      partySize: options.party,
      time: options.time,
      experience: options.experience,
      location: options.location,
      entryUrl: options.entryUrl,
    },
    guest,
    payment: payment as BookingRequest["payment"],
  };
};

program.parseAsync(process.argv);
