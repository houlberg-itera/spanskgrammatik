"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TopicExercisePlayer from "@/components/TopicExercisePlayer";

export default function TopicPlayerPage() {
  const params = useParams();
  const router = useRouter();
  // params.id can be string or string[]
  let topicId: string = Array.isArray(params.id) ? params.id[0] : params.id;
  const [valid, setValid] = useState(true);

  useEffect(() => {
    if (!topicId) {
      setValid(false);
    }
  }, [topicId]);

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Ugyldigt emne</h1>
          <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Tilbage til dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
  <TopicExercisePlayer topicId={topicId} />
      </div>
    </div>
  );
}