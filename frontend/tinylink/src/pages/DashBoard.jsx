import React, { useEffect, useState } from "react";
import axios from "axios";

export default function DashBoard() {
  const API = "http://localhost:3001";

  const [links, setLinks] = useState([]);
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchLinks = async () => {
    const res = await axios.get(`${API}/api/links`);
    setLinks(res.data);
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const createLink = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/api/links`, { url, code });
      setUrl("");
      setCode("");
      fetchLinks();
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    }
    setLoading(false);
  };

  const deleteLink = async (code) => {
    if (!window.confirm("Delete this link?")) return;
    await axios.delete(`${API}/api/links/${code}`);
    fetchLinks();
  };

  return (
    <div className="container">
      <h2 className="mb-4">Dashboard</h2>

      <div className="card p-3 mb-4">
        <h5>Create Short Link</h5>

        <input
          className="form-control mt-2"
          placeholder="Enter Long URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <input
          className="form-control mt-2"
          placeholder="Custom Code (optional)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <button
          className="btn btn-primary mt-3"
          disabled={loading}
          onClick={createLink}
        >
          {loading ? "Creating..." : "Create Link"}
        </button>
      </div>

      <table className="table table-bordered">
        <thead className="table-dark">
          <tr>
            <th>Code</th>
            <th>URL</th>
            <th>Clicks</th>
            <th>Last Clicked</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {links.map((link) => (
            <tr key={link.code}>
              <td>
                <a href={`/code/${link.code}`}>{link.code}</a>
              </td>

              <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {link.url}
              </td>

              <td>{link.clicks}</td>
              <td>{link.last_clicked || "—"}</td>

              <td>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => deleteLink(link.code)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}
