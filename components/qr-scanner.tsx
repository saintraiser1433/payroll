"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, Coffee, LogOut, LogIn, CheckCircle2, XCircle, Loader2 } from "lucide-react"

// Helper function to safely stop scanner
const safeStopScanner = async (scanner: Html5Qrcode): Promise<void> => {
  try {
    await scanner.stop()
  } catch (err: any) {
    // Silently ignore all stop errors
    if (err?.message && (
      err.message.includes('removeChild') ||
      err.message.includes('not a child') ||
      err.message.includes('already stopped') ||
      err.message.includes('NotFoundError')
    )) {
      return
    }
    // Re-throw unexpected errors
    throw err
  }
}

// Helper function to safely clear scanner
const safeClearScanner = (scanner: Html5Qrcode): void => {
  try {
    // Check if element exists
    if (!document.getElementById("qr-reader")) {
      return
    }
    scanner.clear()
  } catch (err: any) {
    // Silently ignore all clear errors
    if (err?.message && (
      err.message.includes('removeChild') ||
      err.message.includes('not a child') ||
      err.message.includes('NotFoundError')
    )) {
      return
    }
    // Log unexpected errors but don't throw
    console.log("Unexpected clear error:", err)
  }
}

interface QRScannerProps {
  onScanSuccess?: (employeeId: string) => void
}

export function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedEmployeeId, setScannedEmployeeId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedAction, setSelectedAction] = useState<'IN' | 'OUT' | 'BREAK_OUT' | 'BREAK_IN' | null>(null)
  const [pendingAction, setPendingAction] = useState<'IN' | 'OUT' | 'BREAK_OUT' | 'BREAK_IN' | null>(null)
  const [isCameraStarting, setIsCameraStarting] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scanAreaRef = useRef<HTMLDivElement>(null)
  const isCleaningUpRef = useRef(false)
  const scannerIdRef = useRef(0)

  const startScanning = async () => {
    // Prevent multiple simultaneous start attempts
    if (isCameraStarting || (isScanning && scannerRef.current)) {
      console.log('Scanner already starting or running')
      return
    }

    try {
      setIsCameraStarting(true)
      // Set scanning state early so buttons appear immediately
      setIsScanning(true)
      setMessage({ type: 'info', text: 'Initializing camera...' })
      
      // Yield to browser to prevent UI freeze
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      
      // Stop any existing scanner first (non-blocking)
      if (scannerRef.current && !isCleaningUpRef.current) {
        const prevScanner = scannerRef.current
        // Don't await - let it happen in background
        safeStopScanner(prevScanner).catch(() => {})
        safeClearScanner(prevScanner)
        scannerRef.current = null
      }

      // Yield again
      await new Promise(resolve => setTimeout(resolve, 50))

      isCleaningUpRef.current = false
      scannerIdRef.current += 1
      
      // Ensure the element exists and is clean
      let element = document.getElementById("qr-reader")
      if (!element) {
        // Try to find the element by ref
        if (scanAreaRef.current) {
          scanAreaRef.current.id = "qr-reader"
          element = scanAreaRef.current
        } else {
          throw new Error("QR reader element not found")
        }
      }
      
      // Clear the element completely using innerHTML (avoids removeChild issues)
      if (element) {
        // Simply clear innerHTML - this is safer than removeChild
        element.innerHTML = ''
        // Also remove any attributes that html5-qrcode might have added
        const attrsToRemove: string[] = []
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i]
          if (attr.name.startsWith('data-html5-qrcode')) {
            attrsToRemove.push(attr.name)
          }
        }
        attrsToRemove.forEach(attr => element.removeAttribute(attr))
      }
      
      // Wait a bit for DOM to settle (non-blocking)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify element still exists and is clean
      element = document.getElementById("qr-reader")
      if (!element) {
        throw new Error("QR reader element not found after cleanup")
      }
      
      // Yield to browser before heavy operations
      await new Promise(resolve => requestAnimationFrame(resolve))

      // Create scanner instance with error suppression
      let html5QrCode: Html5Qrcode
      
      try {
        // Wrap in try-catch to handle any removeChild errors during construction
        html5QrCode = new Html5Qrcode("qr-reader")
        scannerRef.current = html5QrCode
      } catch (err: any) {
        // If initialization fails due to removeChild, clear and retry once
        if (err?.message?.includes('removeChild') || 
            err?.message?.includes('not a child') ||
            err?.message?.includes('Failed to execute')) {
          console.warn('Initialization error (suppressed), retrying...', err.message)
          element.innerHTML = ''
          await new Promise(resolve => setTimeout(resolve, 300))
          
          // Retry with fresh element
          try {
            html5QrCode = new Html5Qrcode("qr-reader")
            scannerRef.current = html5QrCode
          } catch (retryErr: any) {
            // If retry also fails, check if it's removeChild error and ignore it
            if (retryErr?.message?.includes('removeChild') || 
                retryErr?.message?.includes('not a child')) {
              console.warn('Retry also had removeChild error, but continuing...')
              // Try to create anyway - sometimes it works despite the error
              html5QrCode = new Html5Qrcode("qr-reader")
              scannerRef.current = html5QrCode
            } else {
              throw retryErr
            }
          }
        } else {
          throw err
        }
      }

      // Yield again before starting camera (camera access can be slow)
      await new Promise(resolve => requestAnimationFrame(resolve))
      setMessage({ type: 'info', text: 'Requesting camera access...' })

      // Start scanner with error handling and timeout
      let scannerStarted = false
      
      try {
        // Wrap the entire start process in a try-catch to catch any synchronous errors
        const startPromise = (async () => {
          try {
            await html5QrCode.start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                disableFlip: false,
              },
              (decodedText) => {
                // QR code scanned successfully
                console.log('QR Code decoded:', decodedText)
                // Prevent multiple scans of the same code
                if (scannedEmployeeId === decodedText) {
                  return
                }
                handleQRCodeScanned(decodedText)
              },
              (errorMessage) => {
                // Ignore scanning errors (they're frequent during scanning)
                // Only log if it's not a common "not found" error
                if (!errorMessage.includes("NotFoundException")) {
                  // Silently ignore common scanning errors
                }
              }
            )
            return true
          } catch (err: any) {
            // If it's a removeChild error, suppress it
            if (err?.message?.includes('removeChild') || 
                err?.message?.includes('not a child') ||
                err?.message?.includes('Failed to execute')) {
              console.warn('Start error suppressed (removeChild):', err.message)
              // Check if scanner actually started despite the error
              const videoElement = element?.querySelector('video') as HTMLVideoElement
              if (videoElement && videoElement.readyState > 0) {
                return true // Scanner is working
              }
              // If video isn't ready, throw to trigger retry logic
              throw err
            }
            throw err
          }
        })()
        
        // Add timeout to prevent indefinite hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Camera initialization timeout')), 15000)
        })
        
        try {
          await Promise.race([startPromise, timeoutPromise])
          scannerStarted = true
          
          // Immediately check if video is ready (sometimes promise resolves before video is ready)
          setTimeout(() => {
            const videoElement = element?.querySelector('video') as HTMLVideoElement
            if (videoElement && videoElement.readyState > 0 && !scannerStarted) {
              scannerStarted = true
              setIsScanning(true)
              setIsCameraStarting(false)
            }
          }, 100)
        } catch (startErr: any) {
          // If it's a removeChild error, suppress it and check if camera is working
          if (startErr?.message?.includes('removeChild') || 
              startErr?.message?.includes('not a child') ||
              startErr?.message?.includes('Failed to execute')) {
            console.warn('Start error suppressed (removeChild):', startErr.message)
            // Check if scanner actually started despite the error
            const videoElement = element?.querySelector('video') as HTMLVideoElement
            if (videoElement && videoElement.readyState > 0) {
              scannerStarted = true
            }
          } else if (startErr?.message?.includes('timeout')) {
            // Even on timeout, check if camera actually started
            const videoElement = element?.querySelector('video') as HTMLVideoElement
            if (videoElement && videoElement.readyState > 0) {
              scannerStarted = true
              console.log('Camera started despite timeout error')
            } else {
              throw new Error('Camera initialization took too long. Please check camera permissions and try again.')
            }
          } else {
            throw startErr
          }
        }
        
        // Set scanning state immediately if scanner started
        if (scannerStarted) {
          setIsScanning(true)
          setIsCameraStarting(false)
        }
        
        // Poll for video element to detect when camera is actually working
        // This handles cases where the promise resolves but camera isn't ready yet
        let pollAttempts = 0
        const maxPollAttempts = 50 // 5 seconds max (50 * 100ms)
        
        const checkVideoReady = () => {
          pollAttempts++
          // Try multiple selectors to find the video element
          const videoElement = element?.querySelector('video') as HTMLVideoElement || 
                               document.querySelector('#qr-reader video') as HTMLVideoElement ||
                               document.querySelector('video') as HTMLVideoElement
          
          if (videoElement) {
            // Force video to be visible and properly styled
            videoElement.style.cssText = `
              display: block !important;
              width: 100% !important;
              height: auto !important;
              min-height: 300px !important;
              max-height: 500px !important;
              object-fit: contain !important;
              background: transparent !important;
              margin: 0 auto !important;
              visibility: visible !important;
              opacity: 1 !important;
              z-index: 1 !important;
            `
            
            // Also style the container
            if (element) {
              element.style.cssText = `
                position: relative !important;
                width: 100% !important;
                min-height: 300px !important;
                background: #000 !important;
                overflow: hidden !important;
              `
            }
            
            // Check if video is actually playing
            if (videoElement.readyState > 0 || videoElement.videoWidth > 0) {
              // Camera is working!
              setIsScanning(true)
              setIsCameraStarting(false)
              
              console.log('Video element found and styled:', {
                width: videoElement.videoWidth,
                height: videoElement.videoHeight,
                readyState: videoElement.readyState,
                playing: !videoElement.paused
              })
              
              // Try to play the video if it's paused
              if (videoElement.paused) {
                videoElement.play().catch(err => console.warn('Video play error:', err))
              }
              
              // Update message
              if (pendingAction) {
                setMessage({ type: 'info', text: `Action: ${getActionName(pendingAction)}. Position your QR code in front of the camera.` })
              } else {
                setMessage({ type: 'success', text: 'Camera ready! Select an action below, then scan your QR code.' })
              }
              return // Success, stop polling
            } else if (pollAttempts < maxPollAttempts) {
              // Video element exists but not ready yet, keep polling
              setTimeout(checkVideoReady, 100)
              return
            }
          }
          
          // Continue polling if we haven't found it yet
          if (pollAttempts < maxPollAttempts) {
            setTimeout(checkVideoReady, 100)
          } else {
            // Timeout - camera didn't start
            console.warn('Camera did not start within timeout', {
              elementExists: !!element,
              videoElementExists: !!videoElement,
              pollAttempts
            })
            if (!scannerStarted) {
              setIsCameraStarting(false)
              setMessage({ type: 'error', text: 'Camera initialization timeout. Please try again.' })
            }
          }
        }
        
        // Start polling immediately
        setTimeout(checkVideoReady, 200)
      } catch (startErr: any) {
        // If start fails due to removeChild, clean up and show error
        if (startErr?.message?.includes('removeChild') || startErr?.message?.includes('not a child')) {
          scannerRef.current = null
          element.innerHTML = ''
          setMessage({ type: 'error', text: 'Failed to start scanner. Please try again.' })
        } else {
          throw startErr
        }
      }
      } catch (err: any) {
        console.error("Error starting scanner:", err)
        setIsCameraStarting(false)
        setIsScanning(false)
        let errorMessage = 'Failed to start camera. '
        if (err?.message?.includes('Permission') || err?.message?.includes('permission')) {
          errorMessage += 'Please allow camera access and try again.'
        } else if (err?.message?.includes('NotFound') || err?.message?.includes('not found')) {
          errorMessage += 'No camera found. Please connect a camera device.'
        } else if (err?.message?.includes('NotAllowedError') || err?.message?.includes('NotReadableError')) {
          errorMessage += 'Camera access denied or camera is in use by another application.'
        } else {
          errorMessage += `Please check camera permissions and try again. Error: ${err?.message || 'Unknown error'}`
        }
        setMessage({ type: 'error', text: errorMessage })
      }
  }

  const stopScanning = async () => {
    if (isCleaningUpRef.current) {
      return // Already cleaning up
    }

    isCleaningUpRef.current = true
    
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current
        
        // Check if the DOM element still exists
        const element = document.getElementById("qr-reader")
        if (!element) {
          // Element already removed, just clear the reference
          scannerRef.current = null
          isCleaningUpRef.current = false
          setIsScanning(false)
          setScannedEmployeeId(null)
          setSelectedAction(null)
          return
        }

        // Safely stop and clear scanner
        await safeStopScanner(scanner)
        
        // Wait a bit before clearing to let DOM settle
        await new Promise(resolve => setTimeout(resolve, 100))
        
        safeClearScanner(scanner)
      } catch (err) {
        // Ignore all cleanup errors
        console.log("Cleanup error (ignored):", err)
      } finally {
        scannerRef.current = null
        isCleaningUpRef.current = false
      }
    } else {
      isCleaningUpRef.current = false
    }
    
    setIsScanning(false)
    setScannedEmployeeId(null)
    setSelectedAction(null)
    // Don't clear pendingAction here - let user keep their selection
  }

  const handleQRCodeScanned = async (employeeId: string) => {
    try {
      console.log('QR Code scanned - Raw text:', employeeId)
      
      // Validate the scanned text
      if (!employeeId || employeeId.trim() === '') {
        setMessage({ type: 'error', text: 'Invalid QR code. Please try again.' })
        return
      }

      const trimmedId = employeeId.trim()
      console.log('QR Code scanned - Trimmed ID:', trimmedId)
      
      setScannedEmployeeId(trimmedId)
      stopScanning()
      
      // If an action was pre-selected, automatically process it
      if (pendingAction) {
        setMessage({ type: 'info', text: `Processing ${getActionName(pendingAction)} for ${trimmedId}...` })
        await handleAction(pendingAction, trimmedId)
        setPendingAction(null)
      } else {
        setMessage({ type: 'info', text: `QR Code scanned: ${trimmedId}. Select an action below.` })
      }
    } catch (error: any) {
      console.error('Error handling QR code scan:', error)
      const errorMsg = error?.message || 'Failed to process QR code. Please try again.'
      setMessage({ type: 'error', text: errorMsg })
    }
  }

  const handlePreSelectAction = (type: 'IN' | 'OUT' | 'BREAK_OUT' | 'BREAK_IN') => {
    setPendingAction(type)
    setMessage({ type: 'info', text: `Action selected: ${getActionName(type)}. Now scan your QR code.` })
    if (!isScanning) {
      startScanning()
    }
  }

  const getActionName = (type: 'IN' | 'OUT' | 'BREAK_OUT' | 'BREAK_IN'): string => {
    switch (type) {
      case 'IN': return 'Time In'
      case 'OUT': return 'Time Out'
      case 'BREAK_OUT': return 'Break Out'
      case 'BREAK_IN': return 'Break In'
    }
  }

  const handleAction = async (type: 'IN' | 'OUT' | 'BREAK_OUT' | 'BREAK_IN', employeeIdOverride?: string) => {
    const employeeId = employeeIdOverride || scannedEmployeeId
    if (!employeeId) {
      setMessage({ type: 'error', text: 'Please scan a QR code first' })
      return
    }

    // Prevent multiple simultaneous requests
    if (isProcessing) {
      console.log('Already processing, ignoring duplicate request')
      return
    }

    setIsProcessing(true)
    setSelectedAction(type)
    setMessage({ type: 'info', text: `Processing ${getActionName(type)}...` })

    try {
      // Create an AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch('/api/attendance/qr-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: employeeId,
          type,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }))
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('API Response:', data)

      if (data.success) {
        setMessage({ 
          type: 'success', 
          text: data.message || `${getActionName(type)} successful for ${data.employeeName || employeeId}` 
        })
        if (onScanSuccess) {
          onScanSuccess(employeeId)
        }
        // Reset after 3 seconds
        setTimeout(() => {
          setScannedEmployeeId(null)
          setSelectedAction(null)
          setPendingAction(null)
          setMessage(null)
        }, 3000)
      } else {
        const errorMessage = data.message || data.error || 'An error occurred'
        console.error('Attendance error:', errorMessage)
        setMessage({ type: 'error', text: errorMessage })
        setPendingAction(null)
        // Don't clear scannedEmployeeId on error so user can try again
      }
    } catch (error: any) {
      console.error('Error processing attendance:', error)
      
      // Handle different error types
      if (error.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Request timed out. Please try again.' })
      } else if (error.message) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'error', text: 'Failed to process attendance. Please try again.' })
      }
    } finally {
      setIsProcessing(false)
      setSelectedAction(null)
    }
  }

  // Set up error handlers globally (always active to catch errors early)
  useEffect(() => {
    // Set up error handler for removeChild errors
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || event.error?.message || event.error?.toString() || ''
      if (errorMessage.includes('removeChild') || 
          errorMessage.includes('not a child') ||
          errorMessage.includes('Failed to execute \'removeChild\'') ||
          errorMessage.includes('removeChild')) {
        // Suppress removeChild errors completely
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        return false // Return false to prevent default error handling
      }
      return true
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason?.message || reason?.toString() || ''
      if (message.includes('removeChild') || 
          message.includes('not a child') ||
          message.includes('Failed to execute \'removeChild\'') ||
          message.includes('removeChild')) {
        // Suppress removeChild errors
        event.preventDefault()
        event.stopPropagation()
        return false
      }
      return true
    }

    // Add event listeners with capture phase to catch early
    window.addEventListener('error', handleError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection as any, true)

    return () => {
      // Remove event listeners on cleanup
      window.removeEventListener('error', handleError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection as any, true)
    }
  }, []) // Always active, no dependencies

  // Set up styles when scanner is used
  useEffect(() => {
    // Only initialize if scanning is active or about to be
    if (!isScanning && !isCameraStarting) {
      return
    }
    
    // Add custom styles for html5-qrcode video elements (only once)
    const styleId = 'qr-scanner-styles'
    let styleElement = document.getElementById(styleId) as HTMLStyleElement
    
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }
    
    styleElement.textContent = `
      #qr-reader {
        position: relative !important;
        width: 100% !important;
        min-height: 300px !important;
      }
      #qr-reader video {
        width: 100% !important;
        height: auto !important;
        min-height: 300px !important;
        max-height: 500px !important;
        object-fit: contain !important;
        display: block !important;
        background: transparent !important;
        margin: 0 auto !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: 1 !important;
      }
      #qr-reader__scan_region video {
        width: 100% !important;
        height: auto !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      #qr-reader__dashboard {
        display: none !important;
      }
      #qr-reader__scan_region {
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
      }
      #qr-reader__camera_selection {
        display: none !important;
      }
      #qr-reader__camera_permission_button {
        display: none !important;
      }
      #qr-reader__dashboard_section_csr {
        display: none !important;
      }
      #qr-reader__status {
        display: none !important;
      }
    `

    return () => {
      // Styles cleanup handled in separate useEffect
    }
  }, [isScanning, isCameraStarting])

  // Cleanup styles on unmount
  useEffect(() => {
    return () => {
      const styleElement = document.getElementById('qr-scanner-styles')
      if (styleElement) {
        styleElement.remove()
      }

      if (isCleaningUpRef.current) {
        return // Already cleaning up
      }

      isCleaningUpRef.current = true

      if (scannerRef.current) {
        const scanner = scannerRef.current
        
        // Check if element exists before cleanup
        const element = document.getElementById("qr-reader")
        if (!element) {
          scannerRef.current = null
          isCleaningUpRef.current = false
          return
        }

        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(async () => {
          // Safely stop scanner
          await safeStopScanner(scanner)
          
          // Wait before clearing
          setTimeout(() => {
            safeClearScanner(scanner)
            scannerRef.current = null
            isCleaningUpRef.current = false
          }, 50)
        })
      } else {
        isCleaningUpRef.current = false
      }
    }
  }, [])

  return (
    <Card className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-2 border-cyan-200/50 dark:border-cyan-700/50 shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-orange-500 bg-clip-text text-transparent">
          QR Code Attendance
        </CardTitle>
        <CardDescription>
          Scan your QR code to clock in/out
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Display */}
        {message && (
          <Alert
            variant={message.type === 'error' ? 'destructive' : message.type === 'success' ? 'default' : 'default'}
            className={
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800'
                : message.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
            }
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : message.type === 'error' ? (
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            ) : (
              <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800 dark:text-green-200' : message.type === 'error' ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* QR Scanner Area */}
        <div className="relative">
          <div
            key={`qr-reader-${scannerIdRef.current}`}
            id="qr-reader"
            ref={scanAreaRef}
            className={`w-full ${isScanning ? 'min-h-[300px]' : 'min-h-[200px]'} rounded-lg border-2 border-dashed border-cyan-300 dark:border-cyan-700 ${!isScanning ? 'flex items-center justify-center bg-slate-100 dark:bg-slate-800' : ''}`}
            style={isScanning ? { 
              position: 'relative',
              background: '#000',
              overflow: 'hidden'
            } : {}}
          >
            {!isScanning && !isCameraStarting && (
              <div className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center">
                  <Clock className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Click "Start Scanner" to begin
                </p>
              </div>
            )}
            {isCameraStarting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="text-center text-white">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
                  <p className="text-lg font-medium">Starting camera...</p>
                  <p className="text-sm text-white/80 mt-2">Please allow camera access if prompted</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scanner Controls */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button
              onClick={startScanning}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Start Scanner
            </Button>
          ) : (
            <Button
              onClick={stopScanning}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Stop Scanner
            </Button>
          )}
        </div>

        {/* Action Buttons - Show when scanning or after scan */}
        {((isScanning || scannedEmployeeId || isCameraStarting) && !isProcessing) && (
          <div className="space-y-2 pt-4 border-t">
            {scannedEmployeeId && (
              <p className="text-sm font-medium text-center text-slate-700 dark:text-slate-300">
                Employee ID: <span className="font-mono">{scannedEmployeeId}</span>
              </p>
            )}
            {pendingAction && !scannedEmployeeId && (
              <p className="text-sm font-medium text-center text-cyan-600 dark:text-cyan-400">
                Selected: {getActionName(pendingAction)} - Scan QR code to proceed
              </p>
            )}
            {!scannedEmployeeId && !pendingAction && isScanning && (
              <p className="text-sm font-medium text-center text-slate-600 dark:text-slate-400">
                Select an action below, then scan your QR code
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (scannedEmployeeId) {
                    handleAction('IN')
                  } else {
                    handlePreSelectAction('IN')
                  }
                }}
                disabled={isProcessing || (selectedAction !== null && selectedAction !== 'IN')}
                className={`bg-green-600 hover:bg-green-700 text-white ${pendingAction === 'IN' ? 'ring-2 ring-green-400 ring-offset-2' : ''} ${isProcessing && selectedAction === 'IN' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing && selectedAction === 'IN' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Time In
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (scannedEmployeeId) {
                    handleAction('OUT')
                  } else {
                    handlePreSelectAction('OUT')
                  }
                }}
                disabled={isProcessing || (selectedAction !== null && selectedAction !== 'OUT')}
                className={`bg-red-600 hover:bg-red-700 text-white ${pendingAction === 'OUT' ? 'ring-2 ring-red-400 ring-offset-2' : ''} ${isProcessing && selectedAction === 'OUT' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing && selectedAction === 'OUT' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Time Out
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (scannedEmployeeId) {
                    handleAction('BREAK_OUT')
                  } else {
                    handlePreSelectAction('BREAK_OUT')
                  }
                }}
                disabled={isProcessing || (selectedAction !== null && selectedAction !== 'BREAK_OUT')}
                variant="outline"
                className={`border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950 ${pendingAction === 'BREAK_OUT' ? 'ring-2 ring-orange-400 ring-offset-2' : ''} ${isProcessing && selectedAction === 'BREAK_OUT' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing && selectedAction === 'BREAK_OUT' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Coffee className="mr-2 h-4 w-4" />
                )}
                Break Out
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (scannedEmployeeId) {
                    handleAction('BREAK_IN')
                  } else {
                    handlePreSelectAction('BREAK_IN')
                  }
                }}
                disabled={isProcessing || (selectedAction !== null && selectedAction !== 'BREAK_IN')}
                variant="outline"
                className={`border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 ${pendingAction === 'BREAK_IN' ? 'ring-2 ring-blue-400 ring-offset-2' : ''} ${isProcessing && selectedAction === 'BREAK_IN' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing && selectedAction === 'BREAK_IN' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Coffee className="mr-2 h-4 w-4" />
                )}
                Break In
              </Button>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-cyan-600 dark:text-cyan-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Processing...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

