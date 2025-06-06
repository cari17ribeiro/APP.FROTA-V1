'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const Usuario = () => {
  const router = useRouter();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Painel do Motorista</h1>

      <div style={styles.buttonContainer}>
        <button style={styles.button} onClick={() => router.push('/usuario/viagens')}>
          <span style={styles.buttonText}>Minhas Viagens</span>
        </button>
        <button style={styles.button} onClick={() => router.push('/usuario/resumo-premio')}>
          <span style={styles.buttonText}>Resumo Prêmio</span>
        </button>
        <button style={styles.button} onClick={() => router.push('/usuario/correcoes')}>
          <span style={styles.buttonText}>Correções</span>
        </button>
        <button style={styles.button} onClick={() => router.push('/usuario/diaparado')}>
          <span style={styles.buttonText}>Dia Parado</span>
        </button>
      </div>

      {/* Botão Suporte discreto no final */}
      <button
        style={styles.supportButton}
        onClick={() => router.push('/usuario/contato')}
        aria-label="Botão de suporte"
      >
        Suporte
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: '2rem',
    backgroundColor: '#f0f4f8',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '2rem',
    fontWeight: '600',
    color: '#2b6cb0',
    textAlign: 'center',
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    width: '80%',
    maxWidth: '300px',
  },
  button: {
    padding: '1rem',
    fontSize: '1.1rem',
    cursor: 'pointer',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonText: {
    fontWeight: '600',
  },
  supportButton: {
    marginTop: '2rem',
    padding: '0.5rem 1.5rem',
    fontSize: '1rem',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#718096', // cinza mais suave
    border: '1px solid #718096',
    borderRadius: '8px',
    transition: 'background-color 0.3s ease, color 0.3s ease',
    fontWeight: '500',
    alignSelf: 'center',
  },
};

export default Usuario;
