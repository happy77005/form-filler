/**
 * Auto Form Fill Pro - Background Service Worker
 * Handles keyboard shortcut commands and messaging
 */

// Handle keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
    console.log('[Auto Fill Pro] Command received:', command);

    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        console.log('[Auto Fill Pro] No active tab');
        return;
    }

    // Send command to content script
    try {
        chrome.tabs.sendMessage(tab.id, { action: command }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('[Auto Fill Pro] Content script not ready:', chrome.runtime.lastError.message);
                // Try injecting the content script
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                }).catch(err => console.log('[Auto Fill Pro] Script injection failed:', err));
            } else {
                console.log('[Auto Fill Pro] Response:', response);
            }
        });
    } catch (error) {
        console.error('[Auto Fill Pro] Error sending message:', error);
    }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getActiveTab') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            sendResponse({ tab: tabs[0] });
        });
        return true;
    }

    if (message.action === 'showNotification') {
        // Could add chrome.notifications here if needed
        console.log('[Auto Fill Pro] Notification:', message.text);
    }
});

console.log('[Auto Fill Pro] Background service worker loaded');
