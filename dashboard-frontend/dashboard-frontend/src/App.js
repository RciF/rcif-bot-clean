import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Home() {

  const login = () => {
    const CLIENT_ID = "1480292734353805373"
    const REDIRECT_URI = "http://localhost:3000/callback"

    window.location.href =
      `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify guilds`
  }

  return (
    <div style={{ padding: 40, color: "white", background: "#0f172a", minHeight: "100vh" }}>
      <h1>🚀 Dashboard</h1>

      <button onClick={login} style={{
        background: "#5865F2",
        padding: "12px 20px",
        borderRadius: 10,
        border: "none",
        color: "white",
        cursor: "pointer"
      }}>
        Login with Discord
      </button>
    </div>
  )
}

function Callback() {

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("code")

    if (!code) return

    fetch(`http://localhost:4000/api/auth/callback?code=${code}`)
      .then(async res => {
        const data = await res.json().catch(() => null)
        if (!data) throw new Error("Invalid response")
        return data
      })
      .then(data => {
        localStorage.setItem("user", JSON.stringify(data.user))
        localStorage.setItem("guilds", JSON.stringify(data.guilds))

        // 🔥 نقل مضمون
        window.location.href = "/dashboard"
      })
      .catch(err => console.error(err))

  }, [])

  return <p style={{ color: "white", padding: 40 }}>Logging in...</p>
}

function Dashboard() {

  const [users, setUsers] = useState([])
  const [selectedGuild, setSelectedGuild] = useState(null)

  const user = JSON.parse(localStorage.getItem("user") || "null")
  const guilds = JSON.parse(localStorage.getItem("guilds") || "[]")

  useEffect(() => {
    fetch("http://localhost:4000/api/economy/top")
      .then(res => res.json())
      .then(setUsers)
      .catch(err => console.error(err))
  }, [])

  return (
    <div style={{ padding: 40, background: "#020617", minHeight: "100vh", color: "white" }}>

      {/* USER */}
      {user && (
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center" }}>
          {user.avatar && (
            <img src={user.avatar} width={40} style={{ borderRadius: "50%" }} />
          )}
          <span style={{ marginLeft: 10 }}>{user.username}</span>
        </div>
      )}

      {/* GUILDS */}
      <div style={{ marginBottom: 30 }}>
        <h3>Your Servers</h3>

        {guilds.map(g => (
          <div
            key={g.id}
            onClick={() => setSelectedGuild(g)}
            style={{
              padding: "10px",
              marginTop: "5px",
              borderRadius: "8px",
              cursor: "pointer",
              background: selectedGuild?.id === g.id ? "#1e293b" : "#0f172a"
            }}
          >
            {g.name}
          </div>
        ))}

      </div>

      {/* SELECTED SERVER */}
      {selectedGuild && (
        <div style={{
          background: "#1e293b",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "30px"
        }}>
          <h3>Selected Server</h3>
          <p><b>Name:</b> {selectedGuild.name}</p>
          <p><b>ID:</b> {selectedGuild.id}</p>
        </div>
      )}

      {/* LEADERBOARD */}
      <h2>🏆 Leaderboard</h2>

      {users.map((u, i) => (
        <div key={i} style={{
          display: "flex",
          justifyContent: "space-between",
          background: "#0f172a",
          padding: 10,
          marginTop: 10,
          borderRadius: 8
        }}>
          <span>#{i + 1}</span>
          <span>{u.username}</span>
          <span>{u.coins} 💰</span>
        </div>
      ))}

    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}