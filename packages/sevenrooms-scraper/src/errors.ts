export class ScraperError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ScraperError";
  }
}

export class AvailabilityError extends ScraperError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "AvailabilityError";
  }
}

export class BookingError extends ScraperError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "BookingError";
  }
}
