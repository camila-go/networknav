/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  notifyNewMatches,
  notifyConnectionRequest,
  notifyConnectionAccepted,
  notifyNewMessage,
} from "./notification-service";
import { notifications, notificationPreferences } from "@/lib/stores";

describe("Notification Service", () => {
  const testUserId = "test-user-123";

  beforeEach(() => {
    // Clear stores before each test
    notifications.clear();
    notificationPreferences.clear();
  });

  describe("createNotification", () => {
    it("should create a notification with correct structure", () => {
      const notification = createNotification(testUserId, "new_matches");

      expect(notification).toMatchObject({
        userId: testUserId,
        type: "new_matches",
        read: false,
      });
      expect(notification.id).toBeDefined();
      expect(notification.title).toBeDefined();
      expect(notification.body).toBeDefined();
      expect(notification.createdAt).toBeInstanceOf(Date);
    });

    it("should add notification to user's list", () => {
      createNotification(testUserId, "new_matches");
      const userNotifications = getNotifications(testUserId);

      expect(userNotifications).toHaveLength(1);
    });

    it("should add new notifications at the beginning", () => {
      createNotification(testUserId, "new_matches");
      createNotification(testUserId, "connection_request", { senderName: "Jane" });

      const userNotifications = getNotifications(testUserId);

      expect(userNotifications[0].type).toBe("connection_request");
      expect(userNotifications[1].type).toBe("new_matches");
    });

    it("should limit to 50 notifications per user", () => {
      for (let i = 0; i < 55; i++) {
        createNotification(testUserId, "new_matches");
      }

      const userNotifications = getNotifications(testUserId);
      expect(userNotifications).toHaveLength(50);
    });
  });

  describe("getNotifications", () => {
    it("should return empty array for user with no notifications", () => {
      const notifications = getNotifications("non-existent-user");
      expect(notifications).toEqual([]);
    });

    it("should return all notifications for user", () => {
      createNotification(testUserId, "new_matches");
      createNotification(testUserId, "connection_request", { senderName: "John" });
      createNotification(testUserId, "new_message", { senderName: "Jane" });

      const userNotifications = getNotifications(testUserId);
      expect(userNotifications).toHaveLength(3);
    });
  });

  describe("getUnreadCount", () => {
    it("should return 0 for user with no notifications", () => {
      const count = getUnreadCount("non-existent-user");
      expect(count).toBe(0);
    });

    it("should count only unread notifications", () => {
      createNotification(testUserId, "new_matches");
      createNotification(testUserId, "connection_request", { senderName: "John" });

      const userNotifications = getNotifications(testUserId);
      userNotifications[0].read = true;
      notifications.set(testUserId, userNotifications);

      const count = getUnreadCount(testUserId);
      expect(count).toBe(1);
    });
  });

  describe("markAsRead", () => {
    it("should mark a notification as read", () => {
      const notification = createNotification(testUserId, "new_matches");
      expect(notification.read).toBe(false);

      const success = markAsRead(testUserId, notification.id);
      expect(success).toBe(true);

      const userNotifications = getNotifications(testUserId);
      expect(userNotifications[0].read).toBe(true);
    });

    it("should return false for non-existent notification", () => {
      const success = markAsRead(testUserId, "non-existent");
      expect(success).toBe(false);
    });

    it("should return false for non-existent user", () => {
      const success = markAsRead("non-existent-user", "any-id");
      expect(success).toBe(false);
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all notifications as read", () => {
      createNotification(testUserId, "new_matches");
      createNotification(testUserId, "connection_request", { senderName: "John" });
      createNotification(testUserId, "new_message", { senderName: "Jane" });

      const count = markAllAsRead(testUserId);
      expect(count).toBe(3);

      const unreadCount = getUnreadCount(testUserId);
      expect(unreadCount).toBe(0);
    });

    it("should return 0 for user with no notifications", () => {
      const count = markAllAsRead("non-existent-user");
      expect(count).toBe(0);
    });

    it("should only count previously unread notifications", () => {
      createNotification(testUserId, "new_matches");
      const notification = createNotification(testUserId, "connection_request", { senderName: "John" });

      markAsRead(testUserId, notification.id);
      const count = markAllAsRead(testUserId);

      expect(count).toBe(1); // Only one was unread
    });
  });

  describe("deleteNotification", () => {
    it("should delete a notification", () => {
      const notification = createNotification(testUserId, "new_matches");
      expect(getNotifications(testUserId)).toHaveLength(1);

      const success = deleteNotification(testUserId, notification.id);
      expect(success).toBe(true);
      expect(getNotifications(testUserId)).toHaveLength(0);
    });

    it("should return false for non-existent notification", () => {
      createNotification(testUserId, "new_matches");
      const success = deleteNotification(testUserId, "non-existent");
      expect(success).toBe(false);
    });
  });

  describe("Notification Preferences", () => {
    it("should return default preferences for new user", () => {
      const prefs = getPreferences(testUserId);

      expect(prefs).toEqual({
        userId: testUserId,
        email: true,
        inApp: true,
        push: true,
      });
    });

    it("should update preferences", () => {
      updatePreferences(testUserId, { email: false });
      const prefs = getPreferences(testUserId);

      expect(prefs.email).toBe(false);
      expect(prefs.inApp).toBe(true);
      expect(prefs.push).toBe(true);
    });

    it("should preserve existing preferences when updating", () => {
      updatePreferences(testUserId, { email: false });
      updatePreferences(testUserId, { push: false });

      const prefs = getPreferences(testUserId);

      expect(prefs.email).toBe(false);
      expect(prefs.push).toBe(false);
      expect(prefs.inApp).toBe(true);
    });
  });

  describe("Notification Triggers", () => {
    it("notifyNewMatches should create correct notification", () => {
      const notification = notifyNewMatches(testUserId);

      expect(notification.type).toBe("new_matches");
      expect(notification.title).toContain("matches");
    });

    it("notifyConnectionRequest should include sender info", () => {
      const notification = notifyConnectionRequest(
        testUserId,
        "Jane Smith",
        "TechCorp"
      );

      expect(notification.type).toBe("connection_request");
      expect(notification.title).toContain("Jane Smith");
      expect(notification.body).toContain("TechCorp");
    });

    it("notifyConnectionAccepted should include recipient info", () => {
      const notification = notifyConnectionAccepted(testUserId, "John Doe");

      expect(notification.type).toBe("connection_accepted");
      expect(notification.title).toContain("John Doe");
    });

    it("notifyNewMessage should include message preview", () => {
      const notification = notifyNewMessage(
        testUserId,
        "Jane Smith",
        "Hey, great to connect! I wanted to discuss..."
      );

      expect(notification.type).toBe("new_message");
      expect(notification.title).toContain("Jane Smith");
      expect(notification.body).toContain("Hey");
    });

    it("notifyNewMessage should truncate long messages", () => {
      const longMessage = "A".repeat(200);
      const notification = notifyNewMessage(testUserId, "Jane", longMessage);

      expect(notification.data?.preview).toContain("...");
      expect((notification.data?.preview as string).length).toBeLessThan(110);
    });
  });
});

