import L from 'leaflet'
import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'

import 'leaflet/dist/leaflet.css'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

if (L.Icon.Default.prototype._getIconUrl) {
  delete L.Icon.Default.prototype._getIconUrl
}
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

function requestLocation(onSuccess, onError, options) {
  if (!navigator.geolocation) {
    onError({ code: 0, message: 'not-supported' })
    return
  }
  navigator.geolocation.getCurrentPosition(onSuccess, onError, options)
}

export default function CurrentLocationMap({ onLocationResolved }) {
  const [position, setPosition] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    requestLocation(
      (pos) => {
        const next = [pos.coords.latitude, pos.coords.longitude]
        setPosition(next)
        setStatus('ready')
        setError('')
        if (typeof onLocationResolved === 'function') {
          onLocationResolved({ latitude: next[0], longitude: next[1] })
        }
      },
      (geoError) => {
        setStatus('error')
        if (geoError.code === 0 && geoError.message === 'not-supported') {
          setError('Geolocation is not supported in this browser.')
        } else if (geoError.code === 1) {
          setError('Location access denied. Allow location in your browser to see the map.')
        } else if (geoError.code === 2) {
          setError('Location unavailable. Try again later.')
        } else {
          setError(geoError.message || 'Could not read your location.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }, [])

  if (status === 'loading' || !position) {
    if (status === 'error') {
      return (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl bg-[#e8ebe4] px-4 py-6 text-center">
          <p className="text-[14px] leading-[1.45] text-[#4d5968]">{error}</p>
          <button
            type="button"
            onClick={() => {
              setStatus('loading')
              setError('')
              requestLocation(
                (pos) => {
                  const next = [pos.coords.latitude, pos.coords.longitude]
                  setPosition(next)
                  setStatus('ready')
                  if (typeof onLocationResolved === 'function') {
                    onLocationResolved({ latitude: next[0], longitude: next[1] })
                  }
                },
                (geoError) => {
                  setStatus('error')
                  setError(
                    geoError.code === 1
                      ? 'Location access denied.'
                      : geoError.message || 'Could not read your location.'
                  )
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
              )
            }}
            className="rounded-lg bg-[#5f7088] px-4 py-2 text-[13px] font-semibold text-white"
          >
            Try again
          </button>
        </div>
      )
    }

    return (
      <div className="flex h-[240px] items-center justify-center rounded-2xl bg-[#e8ebe4] text-[14px] text-[#5a6270]">
        Waiting for location permission…
      </div>
    )
  }

  return (
    <div className="relative z-0 overflow-hidden rounded-2xl ring-1 ring-[#d8d4cc]">
      <MapContainer
        center={position}
        zoom={14}
        className="h-[240px] w-full [&_.leaflet-control-attribution]:text-[10px]"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>You are here 📍</Popup>
        </Marker>
      </MapContainer>
      <p className="border-t border-[#e6e4de] bg-[#f0f3ec] px-3 py-2 text-[11px] text-[#5f6673]">
        {position[0].toFixed(5)}, {position[1].toFixed(5)}
      </p>
    </div>
  )
}
