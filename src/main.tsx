import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import '@/styles/globals.css'

// Chỉ hiện icon khi font đã tải xong, để mạng chậm không lộ chữ tên icon
document.fonts
  ?.load('24px "Material Symbols Outlined"')
  .then((faces) => {
    if (faces.length > 0) document.documentElement.classList.add('icons-ready')
  })
  .catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
