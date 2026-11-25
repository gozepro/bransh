import { useCallback, useEffect, useState } from 'react'

// Gère l'installation de l'application sur l'écran d'accueil.
// Android / Chrome : un bouton d'installation ; iPhone : des instructions (Safari ne propose pas de bouton).
export function useInstall() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
  )

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }, [deferred])

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return {
    installed,
    canInstall: Boolean(deferred),
    showIosHelp: isIos && !installed,
    available: !installed && (Boolean(deferred) || isIos),
    install,
  }
}
