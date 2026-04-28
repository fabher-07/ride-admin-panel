import '@/styles/globals.css'
import Script from 'next/script'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Script id="theme-init" strategy="beforeInteractive">
        {`(function(){try{var t=localStorage.getItem('admin-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`}
      </Script>
      <ThemeProvider>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </ThemeProvider>
    </>
  )
}
