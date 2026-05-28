import { describe, it, expect } from "vitest";
import {
  unreportedReminderEmail,
  managerReminderEmail,
  needHelpAlertEmail,
} from "./resend.js";

describe("unreportedReminderEmail", () => {
  it("produces subject containing event title", () => {
    const { subject } = unreportedReminderEmail({
      name: "Alice",
      eventTitle: "大地震",
      reportUrl: "https://app.example.com/dashboard",
    });
    expect(subject).toContain("大地震");
    expect(subject).toContain("護你安");
  });

  it("HTML contains name, title, and URL", () => {
    const { html } = unreportedReminderEmail({
      name: "Alice",
      eventTitle: "大地震",
      reportUrl: "https://app.example.com/dashboard",
    });
    expect(html).toContain("Alice");
    expect(html).toContain("大地震");
    expect(html).toContain("https://app.example.com/dashboard");
  });

  it("escapes HTML special chars in name", () => {
    const { html } = unreportedReminderEmail({
      name: '<script>alert("xss")</script>',
      eventTitle: "Test",
      reportUrl: "https://example.com",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("strips newlines from subject to prevent header injection", () => {
    const { subject } = unreportedReminderEmail({
      name: "Alice",
      eventTitle: "Bad\r\nBcc: attacker@evil.com",
      reportUrl: "https://example.com",
    });
    expect(subject).not.toContain("\r");
    expect(subject).not.toContain("\n");
  });

  it("rejects non-http URLs", () => {
    const { html } = unreportedReminderEmail({
      name: "Alice",
      eventTitle: "Test",
      reportUrl: "javascript:alert(1)",
    });
    expect(html).not.toContain("javascript:");
  });
});

describe("managerReminderEmail", () => {
  it("includes unreported count in subject and body", () => {
    const { subject, html } = managerReminderEmail({
      name: "Bob",
      eventTitle: "火災",
      unreportedCount: 5,
      dashboardUrl: "https://example.com/dashboard",
    });
    expect(subject).toContain("5");
    expect(html).toContain("5");
  });

  it("handles zero count", () => {
    const { html } = managerReminderEmail({
      name: "Bob",
      eventTitle: "火災",
      unreportedCount: 0,
      dashboardUrl: "https://example.com/dashboard",
    });
    expect(html).toContain("<strong>0</strong>");
  });

  it("handles NaN count gracefully", () => {
    const { html } = managerReminderEmail({
      name: "Bob",
      eventTitle: "火災",
      unreportedCount: NaN,
      dashboardUrl: "https://example.com/dashboard",
    });
    expect(html).toContain("<strong>0</strong>");
  });
});

describe("needHelpAlertEmail", () => {
  it("includes employee name and event title", () => {
    const { subject, html } = needHelpAlertEmail({
      managerName: "Manager",
      employeeName: "Alice",
      eventTitle: "地震",
      message: "I'm stuck",
      contactPhone: "0912-345-678",
      dashboardUrl: "https://example.com",
    });
    expect(subject).toContain("Alice");
    expect(html).toContain("Alice");
    expect(html).toContain("地震");
  });

  it("includes phone as tel: link", () => {
    const { html } = needHelpAlertEmail({
      managerName: "Manager",
      employeeName: "Alice",
      eventTitle: "地震",
      message: null,
      contactPhone: "0912-345-678",
      dashboardUrl: "https://example.com",
    });
    expect(html).toContain("tel:");
    expect(html).toContain("0912-345-678");
  });

  it("strips non-tel chars from phone", () => {
    const { html } = needHelpAlertEmail({
      managerName: "Manager",
      employeeName: "Alice",
      eventTitle: "地震",
      message: null,
      contactPhone: '"><script>alert(1)</script>',
      dashboardUrl: "https://example.com",
    });
    expect(html).not.toContain("<script>");
  });

  it("omits phone section when null", () => {
    const { html } = needHelpAlertEmail({
      managerName: "Manager",
      employeeName: "Alice",
      eventTitle: "地震",
      message: null,
      contactPhone: null,
      dashboardUrl: "https://example.com",
    });
    expect(html).not.toContain("tel:");
    expect(html).not.toContain("聯絡電話");
  });

  it("omits message section when null", () => {
    const { html } = needHelpAlertEmail({
      managerName: "Manager",
      employeeName: "Alice",
      eventTitle: "地震",
      message: null,
      contactPhone: null,
      dashboardUrl: "https://example.com",
    });
    expect(html).not.toContain("留言");
  });
});
