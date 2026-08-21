export function pickImageFile(onPick: (file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    input.value = "";
    if (file) onPick(file);
  };
  input.click();
}
