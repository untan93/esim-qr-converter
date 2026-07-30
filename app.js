(() => {
  "use strict";

  const fullModeButton = document.getElementById("full-mode-button");
  const fieldsModeButton = document.getElementById("fields-mode-button");
  const fullModePanel = document.getElementById("full-mode-panel");
  const fieldsModePanel = document.getElementById("fields-mode-panel");
  const lpaStringInput = document.getElementById("lpa-string");
  const smdpInput = document.getElementById("smdp-address");
  const matchingIdInput = document.getElementById("matching-id");
  const generateButton = document.getElementById("generate-button");
  const clearGenerateButton = document.getElementById("clear-generate-button");
  const generateMessage = document.getElementById("generate-message");
  const qrResult = document.getElementById("qr-result");
  const qrOutput = document.getElementById("qr-output");
  const encodedValue = document.getElementById("encoded-value");
  const downloadButton = document.getElementById("download-button");
  const copyEncodedButton = document.getElementById("copy-encoded-button");

  const fileInput = document.getElementById("qr-file");
  const dropZone = document.getElementById("drop-zone");
  const decodeMessage = document.getElementById("decode-message");
  const decodeResult = document.getElementById("decode-result");
  const previewCanvas = document.getElementById("image-preview");
  const decodedValue = document.getElementById("decoded-value");
  const copyDecodedButton = document.getElementById("copy-decoded-button");
  const parsedFields = document.getElementById("parsed-fields");
  const parsedFormat = document.getElementById("parsed-format");
  const parsedSmdp = document.getElementById("parsed-smdp");
  const parsedMatchingId = document.getElementById("parsed-matching-id");
  const parsedExtra = document.getElementById("parsed-extra");
  const parsedExtraRow = document.getElementById("parsed-extra-row");

  let inputMode = "full";

  function setInputMode(mode) {
    inputMode = mode;
    const fullActive = mode === "full";

    fullModeButton.classList.toggle("is-active", fullActive);
    fieldsModeButton.classList.toggle("is-active", !fullActive);
    fullModeButton.setAttribute("aria-selected", String(fullActive));
    fieldsModeButton.setAttribute("aria-selected", String(!fullActive));
    fullModePanel.hidden = !fullActive;
    fieldsModePanel.hidden = fullActive;

    clearMessage(generateMessage);
    qrResult.hidden = true;
    window.setTimeout(() => (fullActive ? lpaStringInput : smdpInput).focus(), 0);
  }

  function showMessage(element, text, type) {
    element.textContent = text;
    element.className = `message is-visible ${type}`;
  }

  function clearMessage(element) {
    element.textContent = "";
    element.className = "message";
  }

  function normalizeFullLpa(value) {
    return value.trim().replace(/[\r\n]+/g, "");
  }

  function buildActivationString() {
    if (inputMode === "full") {
      const value = normalizeFullLpa(lpaStringInput.value);
      if (!value) throw new Error("Enter an activation string first.");
      return value;
    }

    const smdp = smdpInput.value.trim();
    const matchingId = matchingIdInput.value.trim();
    if (!smdp) throw new Error("Enter the SM-DP+ address.");
    if (!matchingId) throw new Error("Enter the activation code or Matching ID.");
    if ([smdp, matchingId].some((part) => part.includes("$"))) {
      throw new Error("Do not include the $ separator inside an individual field.");
    }

    return `LPA:1$${smdp}$${matchingId}`;
  }

  function validateActivationString(value) {
    if (value.length > 2048) {
      throw new Error("The value is unusually long. Keep the QR content below 2,048 characters.");
    }

    if (!/^LPA:/i.test(value)) {
      return "The value does not start with LPA:. A QR can still be generated, but it may not be recognized as an eSIM activation code.";
    }

    const parsed = parseLpaString(value);
    if (!parsed || !parsed.smdp || !parsed.matchingId) {
      return "This looks like an LPA string, but one or more expected fields are missing.";
    }

    return "";
  }

  function generateQr() {
    clearMessage(generateMessage);

    if (typeof window.QRCode !== "function") {
      showMessage(generateMessage, "The QR generation library could not load. Check your internet connection and reload the page.", "error");
      return;
    }

    try {
      const value = buildActivationString();
      const warning = validateActivationString(value);

      qrOutput.innerHTML = "";
      new window.QRCode(qrOutput, {
        text: value,
        width: 320,
        height: 320,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M
      });

      encodedValue.textContent = value;
      qrResult.hidden = false;

      if (warning) {
        showMessage(generateMessage, warning, "warning");
      } else {
        showMessage(generateMessage, "QR code generated locally in your browser.", "success");
      }
    } catch (error) {
      qrResult.hidden = true;
      showMessage(generateMessage, error instanceof Error ? error.message : "Unable to generate the QR code.", "error");
    }
  }

  function clearGenerator() {
    lpaStringInput.value = "";
    smdpInput.value = "";
    matchingIdInput.value = "";
    qrOutput.innerHTML = "";
    encodedValue.textContent = "";
    qrResult.hidden = true;
    clearMessage(generateMessage);
    (inputMode === "full" ? lpaStringInput : smdpInput).focus();
  }

  function downloadQr() {
    const canvas = qrOutput.querySelector("canvas");
    const image = qrOutput.querySelector("img");
    const dataUrl = canvas ? canvas.toDataURL("image/png") : image?.src;

    if (!dataUrl) {
      showMessage(generateMessage, "Generate a QR code before downloading it.", "error");
      return;
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "esim-activation-qr.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function copyText(text, button) {
    if (!text) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const helper = document.createElement("textarea");
        helper.value = text;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        const copied = document.execCommand("copy");
        helper.remove();
        if (!copied) throw new Error("Copy failed");
      }

      const original = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => { button.textContent = original; }, 1200);
    } catch {
      const original = button.textContent;
      button.textContent = "Select and copy manually";
      window.setTimeout(() => { button.textContent = original; }, 1800);
    }
  }

  function parseLpaString(value) {
    const trimmed = value.trim();
    if (!/^LPA:/i.test(trimmed)) return null;

    const segments = trimmed.split("$");
    if (segments.length < 3) return null;

    return {
      format: segments[0] || "LPA",
      smdp: segments[1] || "",
      matchingId: segments[2] || "",
      extra: segments.slice(3).join("$") || ""
    };
  }

  function renderParsedFields(value) {
    const parsed = parseLpaString(value);
    if (!parsed) {
      parsedFields.hidden = true;
      return;
    }

    parsedFormat.textContent = parsed.format;
    parsedSmdp.textContent = parsed.smdp || "Not present";
    parsedMatchingId.textContent = parsed.matchingId || "Not present";
    parsedExtra.textContent = parsed.extra || "Not present";
    parsedExtraRow.hidden = !parsed.extra;
    parsedFields.hidden = false;
  }

  function resetDecodeResult() {
    decodeResult.hidden = true;
    decodedValue.textContent = "";
    parsedFields.hidden = true;
    clearMessage(decodeMessage);
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("The image file could not be read."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("The selected file is not a readable image."));
        image.onload = () => resolve(image);
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function decodeFile(file) {
    resetDecodeResult();

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showMessage(decodeMessage, "Choose an image file containing a QR code.", "error");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showMessage(decodeMessage, "The image is larger than 12 MB. Use a smaller screenshot or image.", "error");
      return;
    }
    if (typeof window.jsQR !== "function") {
      showMessage(decodeMessage, "The QR decoding library could not load. Check your internet connection and reload the page.", "error");
      return;
    }

    showMessage(decodeMessage, "Reading the image…", "warning");

    try {
      const image = await loadImage(file);
      const maxDimension = 2200;
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = previewCanvas.getContext("2d", { willReadFrequently: true });

      previewCanvas.width = width;
      previewCanvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const pixels = context.getImageData(0, 0, width, height);
      const result = window.jsQR(pixels.data, width, height, { inversionAttempts: "attemptBoth" });

      if (!result?.data) {
        decodeResult.hidden = true;
        showMessage(decodeMessage, "No readable QR code was found. Try a sharper image with the full QR visible and good contrast.", "error");
        return;
      }

      decodedValue.textContent = result.data;
      renderParsedFields(result.data);
      decodeResult.hidden = false;
      showMessage(decodeMessage, /^LPA:/i.test(result.data) ? "eSIM activation QR decoded successfully." : "QR decoded successfully. The content is not recognized as an LPA activation string.", /^LPA:/i.test(result.data) ? "success" : "warning");
    } catch (error) {
      decodeResult.hidden = true;
      showMessage(decodeMessage, error instanceof Error ? error.message : "Unable to decode the QR image.", "error");
    }
  }

  fullModeButton.addEventListener("click", () => setInputMode("full"));
  fieldsModeButton.addEventListener("click", () => setInputMode("fields"));
  generateButton.addEventListener("click", generateQr);
  clearGenerateButton.addEventListener("click", clearGenerator);
  downloadButton.addEventListener("click", downloadQr);
  copyEncodedButton.addEventListener("click", () => copyText(encodedValue.textContent, copyEncodedButton));
  copyDecodedButton.addEventListener("click", () => copyText(decodedValue.textContent, copyDecodedButton));

  [lpaStringInput, smdpInput, matchingIdInput].forEach((field) => {
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && field !== lpaStringInput) {
        event.preventDefault();
        generateQr();
      }
    });
  });

  fileInput.addEventListener("change", () => decodeFile(fileInput.files?.[0]));

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropZone.classList.remove("is-dragging");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) decodeFile(file);
  });
})();
