"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

export function VehicleShareButton({ title, businessName }: { title: string; businessName: string }) {
  const [feedback, setFeedback] = useState("");

  async function shareVehicle() {
    const url = window.location.href;
    const shareData = { title, text: `${title} at ${businessName}`, url };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setFeedback("Share sheet opened.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setFeedback("Vehicle link copied.");
    } catch {
      setFeedback("Copy the vehicle link from your browser’s address bar.");
    }
  }

  return <div className="detail-share">
    <button className="action-round" type="button" onClick={shareVehicle}><Share2 size={17} /><span>Share</span></button>
    <span className="share-feedback" role="status" aria-live="polite">{feedback}</span>
  </div>;
}
