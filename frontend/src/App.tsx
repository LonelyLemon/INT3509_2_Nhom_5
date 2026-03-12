import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white font-sans p-6">
      <div className="flex space-x-8 mb-8">
        <a href="https://vite.dev" target="_blank" className="hover:scale-110 transition-transform">
          <img src={viteLogo} className="w-24 h-24" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" className="hover:scale-110 transition-transform">
          <img src={reactLogo} className="w-24 h-24 animate-[spin_10s_linear_infinite]" alt="React logo" />
        </a>
      </div>
      
      <h1 className="text-5xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
        Vite + React + TypeScript + Tailwind CSS
      </h1>
      
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl flex flex-col items-center">
        <button 
          onClick={() => setCount((count) => count + 1)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors mb-4"
        >
          Count is {count}
        </button>
        <p className="text-gray-400 mt-2">
          Edit <code className="bg-gray-700 px-2 py-1 rounded text-sm text-pink-300">src/App.tsx</code> and save to test HMR
        </p>
      </div>
      
      <p className="mt-8 text-gray-500 text-sm">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  )
}

export default App
