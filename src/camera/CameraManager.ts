export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable' | 'error'

/**
 * Owns webcam permission requests, the active MediaStream, and device
 * switching. Has no DOM opinions beyond the <video> element it's given.
 */
export class CameraManager {
  onStatusChange: ((status: CameraStatus, message?: string) => void) | null = null

  private readonly videoEl: HTMLVideoElement
  private stream: MediaStream | null = null
  private devices: MediaDeviceInfo[] = []
  private currentIndex = 0

  constructor(videoEl: HTMLVideoElement) {
    this.videoEl = videoEl
  }

  get deviceCount(): number {
    return this.devices.length
  }

  async start(): Promise<void> {
    this.setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      await this.attachStream(stream)
      await this.refreshDeviceList()
      this.setStatus('ready')
    } catch (err) {
      this.handleError(err)
    }
  }

  async switchCamera(): Promise<void> {
    if (this.devices.length < 2) return
    this.currentIndex = (this.currentIndex + 1) % this.devices.length
    const deviceId = this.devices[this.currentIndex]!.deviceId
    this.setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      })
      await this.attachStream(stream)
      this.setStatus('ready')
    } catch (err) {
      this.handleError(err)
    }
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
  }

  private async attachStream(stream: MediaStream): Promise<void> {
    this.stop()
    this.stream = stream
    this.videoEl.srcObject = stream
    await this.videoEl.play()
  }

  private async refreshDeviceList(): Promise<void> {
    const all = await navigator.mediaDevices.enumerateDevices()
    this.devices = all.filter((d) => d.kind === 'videoinput')
    const activeId = this.stream?.getVideoTracks()[0]?.getSettings().deviceId
    const idx = this.devices.findIndex((d) => d.deviceId === activeId)
    if (idx >= 0) this.currentIndex = idx
  }

  private handleError(err: unknown): void {
    this.stop()
    if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
      this.setStatus('denied', 'Camera access denied. Enable it in your browser settings to continue.')
    } else if (err instanceof DOMException && err.name === 'NotFoundError') {
      this.setStatus('unavailable', 'No camera found.')
    } else {
      this.setStatus('error', 'Could not start the camera.')
    }
  }

  private setStatus(status: CameraStatus, message?: string): void {
    this.onStatusChange?.(status, message)
  }
}
