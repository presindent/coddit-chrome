# coddit for Chrome

This is an extension to allow interaction with browser instances of ChatGPT via a REST API identical to OpenAI's. It goes hand-in-hand with [coddit.py](https://github.com/presindent/coddit.py).

## Usage

1. Run server.py locally.
1. Install this extension by entering the Developer Mode on Chrome's or any other Chromium-based browser's Extensions page.
1. Open chatgpt.com and open the extension popup. Click `Connect` to connect with the server on the localhost.

### For coddit.nvim

Add a `chatgpt` model to the `models` table during the coddit.nvim setup, as shown below.

```lua
require("coddit").setup({
  models = {
    ["chatgpt"] = {
      endpoint = "http://127.0.0.1:5000/v1/chat/completions",
      model = "chatgpt",
      api_type = "openai",
    },
  },
  selected_model = "chatgpt",
})
```
