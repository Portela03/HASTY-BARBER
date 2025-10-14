import { useEffect, useState } from "react";
import axios from "axios";

interface Servico {
  id: number;
  nome: string;
  preco: number;
  descricao: string;
}

export default function Servicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchServicos() {
      try {
        const response = await axios.get("http://localhost:3333/services");
        setServicos(response.data);
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchServicos();
  }, []);

  if (loading) return <p className="text-center mt-10">Carregando serviços...</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Nossos Serviços 💈
      </h1>

      <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-6">
        {servicos.map((servico) => (
          <div
            key={servico.id}
            className="bg-white shadow-lg rounded-2xl p-6 hover:scale-105 transition-transform duration-200"
          >
            <h2 className="text-xl font-semibold text-gray-800">{servico.nome}</h2>
            <p className="text-gray-600 mt-2">{servico.descricao}</p>
            <p className="text-green-600 font-bold mt-3">R$ {servico.preco.toFixed(2)}</p>

            <button
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition-colors"
            >
              Agendar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
