const extActionButton = document.getElementById("actionButton");
const extStatus = document.getElementById("statusText");
const systemCheckbox = document.getElementById("acceptSystemPrompt");

let connectionStatus = -1;
let acceptSystemPrompt = true;

function updateExtDom() {
  extActionButton.disabled = connectionStatus !== 0;
  extStatus.textContent =
    connectionStatus === -1
      ? "Unavailable"
      : ["Not connected", "Connected", "Generating"][connectionStatus];
  systemCheckbox.checked = acceptSystemPrompt;
}

/** @param {number} newConnectionStatus */
function setConnectionStatus(newConnectionStatus) {
  connectionStatus = newConnectionStatus;
  updateExtDom();
}

/** @param {boolean} acceptSystemPrompt */
function setAcceptSystemPrompt(value) {
  acceptSystemPrompt = value;
  updateExtDom();
}

/** @type {WebSocket} socket  */
let socket;

/** @param {Event} event */
extActionButton.onclick = function () {
  socket = new WebSocket("ws://localhost:5001");

  /** @param {Event} event */
  socket.onopen = function () {
    console.log("Connected to the websocket.");
    socket.send("r");
    setConnectionStatus(1);
    setAcceptSystemPrompt(true);
  };

  /** @param {MessageEvent<string>} event */
  socket.onmessage = function (event) {
    console.log("Message received.");
    const message = event.data;
    if (message[0] == "s" && !acceptSystemPrompt) {
      socket.send("rsystem");
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          function: (text) => {
            const textarea = document.querySelector("#prompt-textarea");
            if (textarea) {
              textarea.value = text;
              textarea.dispatchEvent(new Event("input", { bubbles: true }));
            }
            const sendButton = document.querySelector(
              '[data-testid="fruitjuice-send-button"]',
            );
            sendButton.click();
            return 2;
          },
          args: [message.slice(1)],
        },
        (results) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Script execution failed:",
              chrome.runtime.lastError.message,
            );
            return;
          }
          setConnectionStatus(results[0]?.result ?? 0);
        },
      );
    });
  };

  /** @param {Event} error */
  socket.onerror = function (error) {
    console.error("WebSocket error:", error);
    setConnectionStatus(0);
  };

  /** @param {CloseEvent} event */
  socket.onclose = function () {
    console.log("Disconnected from WebSocket server");
    setConnectionStatus(0);
  };
};

systemCheckbox.addEventListener("change", function () {
  setAcceptSystemPrompt(this.checked);
});

const checkInterval = setInterval(() => {
  if (connectionStatus === 2) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          function: () => {
            const sendButton = document.querySelector(
              '[data-testid="fruitjuice-send-button"]',
            );
            if (sendButton) {
              const assistantMessages = document.querySelectorAll(
                '[data-message-author-role="assistant"]',
              );
              const lastAssistantMessage =
                assistantMessages[assistantMessages.length - 1];
              return lastAssistantMessage
                ? lastAssistantMessage.textContent
                : null;
            }
            return null;
          },
        },
        (results) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Script execution failed:",
              chrome.runtime.lastError.message,
            );
            return;
          }
          const result = results[0]?.result;
          if (result) {
            setConnectionStatus(1);
            if (acceptSystemPrompt) {
              socket.send("rsystem");
              setAcceptSystemPrompt(false);
            } else socket.send("r" + result);
          }
        },
      );
    });
  }
}, 1000);

window.addEventListener("unload", () => {
  clearInterval(checkInterval);
});

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const currentUrl = tabs[0].url;
  const url = new URL(currentUrl);
  if (url.hostname === "chatgpt.com") {
    connectionStatus = 0;
  }
  updateExtDom();
});
