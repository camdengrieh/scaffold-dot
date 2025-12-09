export { SevenRoomsScraper } from "./SevenRoomsScraper";
export { AvailabilityError, BookingError, ScraperError } from "./errors";
export type {
  AvailabilityResult,
  AvailabilitySearchInput,
  AvailabilitySlot,
  BookingRequest,
  BookingResponse,
  DomSelectors,
  GuestProfile,
  PaymentDetails,
  SevenRoomsScraperOptions,
} from "./types";
export { ConsoleLogger } from "./logger";

import { SevenRoomsScraper } from "./SevenRoomsScraper";
import type { SevenRoomsScraperOptions } from "./types";

export const withSevenRoomsScraper = async <T>(
  options: SevenRoomsScraperOptions,
  handler: (scraper: SevenRoomsScraper) => Promise<T>,
): Promise<T> => {
  const scraper = new SevenRoomsScraper(options);
  try {
    await scraper.init();
    return await handler(scraper);
  } finally {
    await scraper.close();
  }
};
