"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PokemonBoxSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded bg-gray-200 animate-pulse" />
            <div className="h-8 w-20 rounded bg-gray-200 animate-pulse" />
            <div className="h-8 w-20 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-16 rounded bg-gray-200 animate-pulse" />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
