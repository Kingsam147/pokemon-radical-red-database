"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function TeamBenchSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-9 w-full rounded bg-gray-200 animate-pulse" />

        <div className="rounded-lg border border-gray-100 p-3 space-y-3">
          <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
          <div className="h-48 w-full rounded bg-gray-100 animate-pulse" />
        </div>

        <div>
          <div className="h-4 w-28 rounded bg-gray-200 animate-pulse mb-2" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-lg bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
