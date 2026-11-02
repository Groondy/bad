declare module '#auth-utils' {
  interface User {
    id: number
    firstName: string
    lastName: string
    role: 'player' | 'admin'
    groupId: number
  }
}

export {}
