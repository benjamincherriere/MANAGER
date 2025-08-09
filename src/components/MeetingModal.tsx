import { useState } from 'react'

interface Meeting {
  title: string
  date: string
  time: string
  location: string
  description: string
}

interface MeetingModalProps {
  initialMeeting?: Partial<Meeting>
  onClose: () => void
}

const formatICSDate = (date: Date) =>
  date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

const MeetingModal = ({ initialMeeting = {}, onClose }: MeetingModalProps) => {
  const [meeting, setMeeting] = useState<Meeting>({
    title: initialMeeting.title ?? '',
    date: initialMeeting.date ?? '',
    time: initialMeeting.time ?? '',
    location: initialMeeting.location ?? '',
    description: initialMeeting.description ?? '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setMeeting((prev) => ({ ...prev, [name]: value }))
  }

  const handleGenerateInvite = () => {
    const start = new Date(`${meeting.date}T${meeting.time}`)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${meeting.title}\nDTSTART:${formatICSDate(start)}\nDTEND:${formatICSDate(end)}\nLOCATION:${meeting.location}\nDESCRIPTION:${meeting.description}\nEND:VEVENT\nEND:VCALENDAR`
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meeting.title || 'meeting'}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-4 rounded w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Rendez-vous</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-gray-500"
          >
            ×
          </button>
        </div>
        <div className="space-y-2">
          <input
            name="title"
            value={meeting.title}
            onChange={handleChange}
            placeholder="Titre"
            className="w-full border p-2"
          />
          <input
            type="date"
            name="date"
            value={meeting.date}
            onChange={handleChange}
            className="w-full border p-2"
          />
          <input
            type="time"
            name="time"
            value={meeting.time}
            onChange={handleChange}
            className="w-full border p-2"
          />
          <input
            name="location"
            value={meeting.location}
            onChange={handleChange}
            placeholder="Lieu"
            className="w-full border p-2"
          />
          <textarea
            name="description"
            value={meeting.description}
            onChange={handleChange}
            placeholder="Description"
            className="w-full border p-2"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Fermer
          </button>
          <button
            onClick={handleGenerateInvite}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Invitation
          </button>
        </div>
      </div>
    </div>
  )
}

export default MeetingModal

