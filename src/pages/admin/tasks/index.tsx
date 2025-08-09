import { useState, useEffect } from 'react'

type Task = {
  id: number
  text: string
  completed: boolean
}

const defaultTasks: Task[] = [
  { id: 1, text: 'Appeler les clients', completed: false },
  { id: 2, text: 'Réviser les stocks', completed: false },
  { id: 3, text: 'Envoyer les emails', completed: false }
]

const TasksList = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const stored = localStorage.getItem('dailyTasks')
    return stored ? JSON.parse(stored) : defaultTasks
  })

  useEffect(() => {
    localStorage.setItem('dailyTasks', JSON.stringify(tasks))
  }, [tasks])

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task => (task.id === id ? { ...task, completed: !task.completed } : task)))
  }

  return (
    <div className='p-4'>
      <h2 className='text-xl mb-4'>Tâches quotidiennes</h2>
      <ul>
        {tasks.map(task => (
          <li key={task.id} className='flex items-center mb-2'>
            <input
              type='checkbox'
              className='mr-2'
              checked={task.completed}
              onChange={() => toggleTask(task.id)}
            />
            <span className={task.completed ? 'line-through' : ''}>{task.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TasksList
