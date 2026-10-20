import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import "@/styles/globals.css";

/*
  Icon Material Symbols chỉ hiện khi font đã tải xong (globals.css: html:not(.icons-ready) làm icon trong suốt), để
  mạng chậm không lộ chữ tên icon. Font không tải được (bị chặn, mất mạng) thì icon giữ trong suốt, chữ trên nút vẫn còn.
*/
document.fonts
  ?.load('24px "Material Symbols Outlined"')
  .then((faces) => {
    if (faces.length > 0) document.documentElement.classList.add("icons-ready");
  })
  .catch(() => {});

/*
  Giao diện đã chọn (Sáng / Tối) được áp ngay trong <head> của index.html (20/10/2026), trước khi trang vẽ lần đầu: áp ở
  đây thì phải chờ JS tải xong, máy để tối mà khách đã chọn "Sáng" có thể thấy nền tối một nhịp.
*/
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
