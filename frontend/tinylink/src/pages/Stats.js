import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

export default function Stats() {
  const { code } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`/api/links/${code}`)
      .then(res => setData(res.data))
      .catch(() => setData("notfound"));
  }, [code]);

  if (data === null) return <p className="text-center mt-5">Loading...</p>;
  if (data === "notfound") return <p className="text-center mt-5 text-danger">Code Not Found</p>;

  return (
    <div className="container mt-4">
      <h2>Stats for: {code}</h2>
      <div className="card p-3 mt-3">

        <p><strong>Original URL:</strong> {data.url}</p>
        <p><strong>Total Clicks:</strong> {data.clicks}</p>
        <p><strong>Last Clicked:</strong> {data.last_clicked || "Never"}</p>

      </div>
    </div>
  );
}
