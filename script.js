async function getClipboard() {
  const preview = document.getElementById("preview");
  const textInput = document.getElementById("textInput");
  const imageInput = document.getElementById("imageInput");
  const message = document.getElementById("message");

  try {
    const items = await navigator.clipboard.read();
    let found = false;

    for (const item of items) {
      if (item.types.includes('image/png')) {
        const blob = await item.getType('image/png');
        const reader = new FileReader();
        reader.onload = () => {
          preview.innerHTML = `<img src="${reader.result}" />`;
          imageInput.value = reader.result;
        };
        reader.readAsDataURL(blob);
        found = true;
      } else if (item.types.includes('text/plain')) {
        const blob = await item.getType('text/plain');
        const text = await blob.text();
        textInput.value = text;
        found = true;
      }
    }

    message.textContent = found ? "" : "❗ Clipboard không chứa hình ảnh hoặc văn bản.";
  } catch (err) {
    message.textContent = "❗ Lỗi khi lấy clipboard: " + err;
  }
}

document.getElementById("saveForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const formData = new FormData(this);
  fetch("save.php", { method: "POST", body: formData })
    .then((res) => {
      if (res.ok) {
        showMessage("✅ Đã lưu thành công!");
        loadSaved();
        this.reset();
        document.getElementById("preview").innerHTML = "";
      } else {
        showMessage("❗ Lỗi khi lưu.");
      }
    });
});

function deleteEntry(filename) {
  if (!confirm("Bạn có chắc muốn xoá?")) return;
  fetch("delete.php?file=" + encodeURIComponent(filename)).then(() => {
    showMessage("🗑 Đã xoá.");
    loadSaved();
  });
}

function loadSaved() {
  fetch("view.php")
    .then((res) => res.text())
    .then((html) => {
      document.getElementById("savedContent").innerHTML = html;
    });
}

function showMessage(msg) {
  document.getElementById("message").textContent = msg;
}

window.onload = loadSaved;