'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react' // ícone opcional (lucide)

export default function NavMenu() {
  const router = useRouter()

  return (
    <nav className="bg-white shadow p-4 mb-4 rounded-xl flex items-center gap-4">
      {/* Botão Voltar */}
      <button
        onClick={() => router.back()}
        className="text-gray-500 hover:text-black flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      {/* Menu */}
      <Link href="/admin" className="text-sm text-gray-700 hover:underline">Admin</Link>
      <Link href="/admin/diaparado" className="text-sm text-gray-700 hover:underline">Dia Parado</Link>
      <Link href="/usuario" className="text-sm text-gray-700 hover:underline">Usuário</Link>
      <Link href="/login" className="text-sm text-gray-700 hover:underline">Sair</Link>
    </nav>
  )
}
