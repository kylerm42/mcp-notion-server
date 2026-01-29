import { describe, test, expect, beforeEach, vi } from "vitest";
import { logger, LogLevel } from "./logger.js";

describe("Logger", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock console.error to avoid polluting test output
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  test("should default to info level", () => {
    expect(logger.getLevel()).toBe("info");
  });

  test("should allow setting log level programmatically", () => {
    logger.setLevel("debug");
    expect(logger.getLevel()).toBe("debug");
    
    logger.setLevel("error");
    expect(logger.getLevel()).toBe("error");
    
    // Reset to info for other tests
    logger.setLevel("info");
  });

  test("should throw error for invalid log level", () => {
    expect(() => {
      // @ts-ignore - intentionally testing with invalid value
      logger.setLevel("invalid");
    }).toThrow("Invalid log level");
  });

  test("should log info messages at info level", () => {
    logger.setLevel("info");
    logger.info("test message");
    
    expect(console.error).toHaveBeenCalledWith("[INFO] test message");
  });

  test("should log debug messages at debug level", () => {
    logger.setLevel("debug");
    logger.debug("debug message");
    
    expect(console.error).toHaveBeenCalledWith("[DEBUG] debug message");
  });

  test("should not log debug messages at info level", () => {
    logger.setLevel("info");
    logger.debug("debug message");
    
    expect(console.error).not.toHaveBeenCalled();
  });

  test("should log warn messages at warn level", () => {
    logger.setLevel("warn");
    logger.warn("warning message");
    
    expect(console.error).toHaveBeenCalledWith("[WARN] warning message");
  });

  test("should not log info messages at warn level", () => {
    logger.setLevel("warn");
    logger.info("info message");
    
    expect(console.error).not.toHaveBeenCalled();
  });

  test("should log error messages at error level", () => {
    logger.setLevel("error");
    logger.error("error message");
    
    expect(console.error).toHaveBeenCalledWith("[ERROR] error message");
  });

  test("should not log warn messages at error level", () => {
    logger.setLevel("error");
    logger.warn("warning message");
    
    expect(console.error).not.toHaveBeenCalled();
  });

  test("should not log any messages at silent level", () => {
    logger.setLevel("silent");
    logger.debug("debug");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");
    
    expect(console.error).not.toHaveBeenCalled();
  });

  test("should respect log level hierarchy", () => {
    logger.setLevel("info");
    
    // Should log info, warn, error
    logger.info("info");
    logger.warn("warn");
    logger.error("error");
    expect(console.error).toHaveBeenCalledTimes(3);
    
    // Should not log debug
    logger.debug("debug");
    expect(console.error).toHaveBeenCalledTimes(3);
  });
});
