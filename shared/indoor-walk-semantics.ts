export interface IndoorWalkRoomSemantic {
  name: string
  category: string
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
}

export function indoorWalkRoomSemantic(source: string): IndoorWalkRoomSemantic | null {
  const match = source.trim().match(/^3D\s*\|\s*F\d+\s*\|\s*(GLASS ENTRY|KITCHEN(?: \+ WALKWAY)?|RESTROOM ZONE|WORKROOM \d+)$/i)
  if (!match?.[1]) return null
  const raw = match[1].replace(/\s+ZONE$/i, '').trim()
  const name = /^glass entry$/i.test(raw) ? 'Main Entry' : /^kitchen \+ walkway$/i.test(raw) ? 'Kitchen' : titleCase(raw)
  const category = /entry/i.test(name) ? 'Entrance' : /kitchen/i.test(name) ? 'Kitchen' : /restroom/i.test(name) ? 'Restroom' : /workroom/i.test(name) ? 'Workroom' : 'Room'
  return { name, category }
}
