import React, { useState, useEffect, useRef } from "react";
import Button from "../components/ui/button";
import { supabase } from "../lib/superbase";
import { Card }  from '../components/ui/card'; // ou onde estiver o componente
import { FileText, Eye, UploadCloud, CreditCard, Printer } from 'lucide-react';

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface RowDetailsModalProps {
  selectedRow: any;
  onClose: () => void;
}

interface Material {
  nome: string;
  qtd: number;
  valor_unitario: number;
  valor_total: number;
  discriminacao: string; 
  subcategoria: string;
}

const RowDetailsModal: React.FC<RowDetailsModalProps> = ({ selectedRow, onClose }) => {
  const [openModal, setOpenModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [additionalRows, setAdditionalRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBoleto, setLoadingBoleto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [Referente, setReferente] = useState<string | null>(null);
  const [notaFiscalUrl, setNotaFiscalUrl] = useState<string | null>(null);
  const [nfNumber, setNfNumber] = useState<string | null>(null);
  const [Renovacao, setRenovacaoAutomatica] = useState<boolean | null>(null);
  const [QTDProdutos, setQTDProdutos] = useState<string | null>(null);
  const [Lancadopor, setLancadoPor] = useState<string | null>(null);
  const [CentrosdeCusto, setCC] = useState<string | null>(null);
  const [Comprovante, setComprovante] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isOpenPagamentos, setIsOpenPagamentos] = useState(false);
  const [codigo, setCodigo] = React.useState<string | null>(null);
const [materiais, setMateriais] = React.useState<Material[]>([]);
const [pagos, setPagos] = useState(0);
const [naoPagos, setNaoPagos] = useState(0);
const [reembolsosCount, setReembolsosCount] = useState(0);
const [reembolsosPagos, setReembolsosPagos] = useState(0);
const [reembolsosNaoPagos, setReembolsosNaoPagos] = useState(0);
const [openPaymentModal, setOpenPaymentModal] = useState(false);
const [paymentDate, setPaymentDate] = useState('');
const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
const [modalMode, setModalMode] = React.useState<"pagar" | "comprovante" | null>(null);
const [selectedRowId, setSelectedRowId] = useState<string | null>(null);



const handleViewComprovante = async (filePath: string) => {
  const { data, error } = await supabase
    .storage
    .from('comprovantes-pagamentos')
    .createSignedUrl(filePath, 60); // Link válido por 60 segundos

  if (error) {
    console.error('Erro ao gerar link do comprovante:', error);
    alert('Erro ao abrir o comprovante.');
    return;
  }

  if (data?.signedUrl) {
    window.open(data.signedUrl, '_blank');
  }
};

const handleInsertComprovante = async () => {
  if (!comprovanteFile) {
    alert('Por favor, selecione um comprovante para anexar.');
    return;
  }

  if (!selectedRowId) {
    alert('ID da linha não encontrado.');
    return;
  }

  try {
    const timestamp = Date.now();
    const fileExtension = comprovanteFile.name.split('.').pop();
    const comprovanteFileName = `comprovante_${selectedRowId}_${timestamp}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from('comprovantes-pagamentos')
      .upload(comprovanteFileName, comprovanteFile);

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      alert('Erro ao fazer upload do comprovante.');
      return;
    }

    const { error: updateError } = await supabase
      .from('provisao_pagamentos')
      .update({
        comprovante_pagamento: comprovanteFileName,
      })
      .eq('id', selectedRowId);

    if (updateError) {
      console.error('Erro na atualização:', updateError);
      alert('Erro ao salvar o comprovante.');
      return;
    }

    alert('Comprovante anexado com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    alert('Ocorreu um erro inesperado.');
  } finally {
    setOpenPaymentModal(false);
    setComprovanteFile(null);
    setSelectedRowId(null);
    fetchAdditionalRows();
  }
};


  // Função para buscar mais linhas no Supabase
const fetchAdditionalRows = async () => {
  if (!selectedRow || !selectedRow.codigo) {
    setError("Dados inválidos para buscar informações.");
    return;
  }

  setLoading(true);

  const { data, error } = await supabase
    .from("provisao_pagamentos")
    .select(
      "id, formapagamento, comprovante_pagamento, nparcelas, formaaserpago,  qtdparcelas, boleto, valor, valor_total, cnpj, venceem, pagoem, empresa"
    )
    .eq("codigo", selectedRow.codigo);

  setLoading(false);

  if (error) {
    setError(`Erro ao buscar dados: ${error.message}`);
  } else {
    setError(null);
    setAdditionalRows(data);

    // Total pagos e não pagos (geral)
    const total = data.length;
    const naoPagos = data.filter((item) => !item.pagoem || item.pagoem === "").length;
    const pagos = total - naoPagos;

    // Filtra só os "Reembolso"
const reembolsos = data.filter(item =>
  item.formapagamento?.toLowerCase().includes("reembolso")
);
    const reembolsosNaoPagos = reembolsos.filter((item) => !item.pagoem || item.pagoem === "").length;
    const reembolsosPagos = reembolsos.length - reembolsosNaoPagos;

    console.log(`✅ Pagos: ${pagos}`);
    console.log(`❌ Não pagos: ${naoPagos}`);
    console.log(`🔄 Reembolsos totais: ${reembolsos.length}`);
    console.log(`🔄 Reembolsos pagos: ${reembolsosPagos}`);
    console.log(`🔄 Reembolsos não pagos: ${reembolsosNaoPagos}`);

    setPagos(pagos);
    setNaoPagos(naoPagos);

    // Novos estados para reembolso
    setReembolsosCount(reembolsos.length);
    setReembolsosPagos(reembolsosPagos);
    setReembolsosNaoPagos(reembolsosNaoPagos);
  }
};

const handleAddPayment = (id: string, mode: "pagar" | "comprovante") => {
  setSelectedRowId(id);
  setModalMode(mode);
  setOpenPaymentModal(true);
};

  useEffect(() => {
    fetchAdditionalRows();
  }, [selectedRow]);



  // Função para abrir boleto pelo caminho recebido
const handlePrintBoleto = async (boletoPath: string, formaDePagamento: string) => {
  if (!boletoPath) {
    setModalMessage(`Forma de pagamento: ${formaDePagamento}`);
    setOpenModal(true);
    return;
  }

  try {
    setLoadingBoleto(true);
    const { data, error } = await supabase.storage
      .from("boletos")
      .download(boletoPath);

    if (error) {
      console.error("Erro ao baixar boleto:", error);
      alert("Erro ao baixar boleto.");
      return;
    }

    const url = URL.createObjectURL(data);
    window.open(url, "_blank");
  } catch (error) {
    console.error("Erro:", error);
    alert("Erro inesperado.");
  } finally {
    setLoadingBoleto(false);
  }
};

const handleConfirmPayment = async () => {
  if (!paymentDate) {
    alert('Por favor, informe a data do pagamento.');
    return;
  }

  if (!selectedRowId) {
    alert('ID da linha não encontrado.');
    return;
  }

  const now = new Date();
  const pagoem = now.toISOString().slice(0, 19).replace('T', ' ');

  try {
    let comprovanteFileName = null;

    if (comprovanteFile) {
      const timestamp = Date.now();
      const fileExtension = comprovanteFile.name.split('.').pop();
      comprovanteFileName = `comprovante_${selectedRowId}_${timestamp}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('comprovantes-pagamentos')
        .upload(comprovanteFileName, comprovanteFile);

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        alert('Erro ao fazer upload do comprovante.');
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('provisao_pagamentos')
      .update({
        
        pagoem: pagoem, // 👈 Aqui vai com data + hora
        comprovante_pagamento: comprovanteFileName,
      })
      .eq('id', selectedRowId);

    if (updateError) {
      console.error('Erro na atualização:', updateError);
      alert('Erro ao salvar as informações.');
      return;
    }

    alert('Pagamento registrado com sucesso!');
  } catch (error) {
    console.error('Erro:', error);
    alert('Ocorreu um erro inesperado.');
  } finally {
    setOpenPaymentModal(false);
    setPaymentDate('');
    setComprovanteFile(null);
    setSelectedRowId(null);
    fetchAdditionalRows(); // <- Essa é a função que você já deve ter para carregar os dados
  }
};




  const formatDate = (date: string | number | null) => {
    if (!date) return "-";
    return new Date(String(date)).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number | null) => {
    if (value == null) return "R$ 0,00";
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };



const parseCentroDeCusto = (texto: string | null) => {
  if (!texto) return [];

  const partes = texto.split(/;|\s/).filter(p => p.trim() !== "");

  const resultado = [];
  for (let i = 0; i < partes.length; i += 2) {
    resultado.push({
      nome: partes[i],
      percentual: partes[i + 1] || "",
    });
  }

  return resultado;
};

const centros = parseCentroDeCusto(CentrosdeCusto);

  // Busca a NF no banco
const fetchNf = async () => {
  console.log('🔍 Buscando dados da NF para o código:', selectedRow?.codigo);

  const { data, error } = await supabase
    .from('gerenciamento_compras')
    .select('numero_comprovante, lancadopor, centros_de_custo, quantidade_produtos, renovacao_automatica, comprovante')
    .eq('codigo', selectedRow?.codigo)
    .single();

  console.log('📦 Resultado da busca:', { data, error });

  if (error) {
    console.error('❌ Erro ao buscar NF:', error);
    return;
  }

  console.log('✅ Dados recebidos:', data);

  setNfNumber(data?.numero_comprovante || null);
  setQTDProdutos(data?.quantidade_produtos || null);
  setLancadoPor(data?.lancadopor || null);
  setCC(data?.centros_de_custo || null);
  setRenovacaoAutomatica(data?.renovacao_automatica || null);
  setComprovante(data?.comprovante || null);
};


  // Busca a referência
const fetchReferencia = async () => {
  console.log('🔍 Buscando dados do serviço para o código', selectedRow?.codigo);

  const { data, error } = await supabase
    .from('produtos')
    .select('nome')
    .eq('codigo', selectedRow?.codigo)
    .single();

  console.log('📦 Resultado da busca:', { data, error });

  if (error) {
    console.error('❌ Erro ao buscar referência de serviço:', error);
    return;
  }

  console.log('✅ Dados recebidos:', data);

  setReferente(data?.nome || null);

};



  useEffect(() => {
    if (selectedRow) {
      fetchNf()
      fetchReferencia();
    }
  }, [selectedRow]);



const handleOpenNotaFiscal = async () => {
  const nf = await fetchNotaFiscal();
  if (nf) {
    const url = await fetchNotaFiscalUrl(nf);
    if (url) {
      window.open(url, '_blank'); // Abre em nova aba
    } else {
      alert("URL da nota fiscal não encontrada.");
    }
  } else {
    alert("Nota fiscal não encontrada.");
  }
};



const fetchNotaFiscal = async () => {
  if (!selectedRow?.codigo) return;

  const { data, error } = await supabase
    .from('gerenciamento_compras')
    .select('nf')
    .eq('codigo', selectedRow.codigo)
    .single();

  if (error) {
    setError(`Erro ao buscar NF: ${error.message}`);
    return null;
  }

  return data?.nf || null;
};


const fetchNotaFiscalUrl = async (fileName: string) => {
  const { data, error } = await supabase.storage
    .from('notas-fiscais')
    .createSignedUrl(fileName, 60 * 60); // URL válida por 1 hora

  if (error) {
    setError(`Erro ao gerar URL assinada: ${error.message}`);
    return null;
  }

  return data?.signedUrl || null;
};;


const fetchMateriais = async (codigo: string) => {
  try {
    const { data, error } = await supabase
      .from('produtos')
      .select('nome, codigo, discriminacao, subcategoria, qtd, valor_unitario, valor_total')
      .eq('codigo', codigo); // <- usa o código que vem como parâmetro

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    return [];
  }
};

// Ao clicar no botão:
const handleVerMateriais = async () => {
  if (!selectedRow?.codigo) return;

  const data = await fetchMateriais(selectedRow.codigo);
  setMateriais(data);
  setIsOpen(true);
};

const adjustedNaoPagos = naoPagos - reembolsosNaoPagos > 0 ? naoPagos - reembolsosNaoPagos : 0;


useEffect(() => {
  const fetchNota = async () => {
    const nf = await fetchNotaFiscal();
    if (nf) {
      const url = await fetchNotaFiscalUrl(nf);
      if (url) {
        setNotaFiscalUrl(url);
      }
    }
  };

  fetchNota();
}, [selectedRow]); 


  return (
   <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-white/30 z-50">



<div
  ref={modalRef}
  className={`relative border-b rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-3xl 
    ${selectedRow?.origem === "Contratos" 
      ? 'bg-gradient-to-br from-white via-blue-50 to-blue-100' 
      : 'bg-gradient-to-br from-white via-red-50 to-neutral-100'
    }`
  }
>

    <button
  onClick={onClose}
  className="absolute top-4 right-4 rounded-md p-2 
  text-gray-500 hover:text-gray-700 hover:bg-gray-100 
  transition-colors"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
</button>

 


  {/* Cabeçalho */}
{/* Cabeçalho */}
<h2 className="text-2xl font-bold mb-5 text-gray-800 flex justify-between items-center">
  {selectedRow?.origem === "Contratos" ? (
    <div>
      {`Contrato de prestação ${selectedRow?.periodicidade || ''}`}
    </div>
  ) : (
    <>
      <span>{Comprovante}</span>
      <span className="text-sm font-semibold text-gray-800">
        Código interno: {selectedRow?.codigo || '...'}
      </span>
    </>
  )}
</h2>

{selectedRow?.origem === "Contratos" && (
  <>
    <span className="text-sm font-semibold text-gray-600 mb-2 block">
      Referente a: {Referente}
    </span>
    <span className="text-sm font-semibold text-gray-600 mr-10 block">
      código interno: {selectedRow?.codigo || '...'}
    </span>
  </>
)}


{/* Linha tênue */}
<div className="border-b border-gray-300 mb-6"></div>

  {/* Informações principais */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6  text-sm text-gray-800">

  {/* Seção: Dados principais */}
  <div className="space-y-2">
    <div><span className="font-medium text-gray-600">Data da compra:</span> {selectedRow?.data_compra}</div>
    <div><span className="font-medium text-gray-600">Empresa:</span> {selectedRow?.empresa}</div>
    <div><span className="font-medium text-gray-600">CNPJ:</span> {selectedRow?.cnpj}</div>
    <div><span className="font-medium text-gray-600">Origem:</span> {selectedRow?.origem}</div>
  </div>

  {/* Seção: Dados financeiros */}
  <div className="space-y-2">
    <div><span className="font-medium text-gray-600">Valor Total:</span> {formatCurrency(selectedRow?.valor_total)}</div>
    {selectedRow?.origem !== "Contratos" && (
  <div>
    <span className="font-medium text-gray-600">
      (Qtd.) Materiais ou Serviços:
    </span> {QTDProdutos || '-'}
  </div>
)}
    <div><span className="font-medium text-gray-600">Lançamento:</span> {selectedRow?.lancadoem}</div>
    <div><span className="font-medium text-gray-600">Lançado por:</span> {Lancadopor}</div>
    {selectedRow?.origem === "Contratos" && (
  <div className={`flex items-center gap-2 ${Renovacao ? "text-blue-600" : "text-yellow-600"}`}>
    <span className="font-medium">
      {Renovacao ? "Renovação automática habilitada ✔️" : "Renovação automática desabilitada ❌"}
    </span>
  </div>
)}

  </div>

  {/* Seção: Centro de Custo */}
  <div className="md:col-span-2">
    <div className="font-medium text-gray-600 mb-1">Centro de Custo:</div>
    {CentrosdeCusto ? (
      <div className="flex flex-wrap gap-2">
        {parseCentroDeCusto(CentrosdeCusto).map((item, index) => (
          <div key={index} className="bg-gray-100 rounded-xl px-3 py-1 text-sm flex items-center gap-1">
            <span className="font-semibold text-gray-700">{item.nome}</span>
            <span className="text-blue-600 font-semibold">{item.percentual}</span>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-gray-500">Não informado</div>
    )}
  </div>

  {/* Seção: Compra Parcelada */}
<div
  className={`md:col-span-2 rounded-xl p-4 flex flex-col gap-4 border ${
    adjustedNaoPagos > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
  }`}
>
  <div
    className={`font-semibold text-sm flex items-center gap-2 ${
      adjustedNaoPagos > 0 ? 'text-yellow-800' : 'text-green-800'
    }`}
  >
    {selectedRow?.qtdparcelas > 0
      ? adjustedNaoPagos > 0
        ? '⚠️ PAGAMENTO PARCELADO'
        : '✅ PAGAMENTO PARCELADO QUITADO'
      : 'Informações de pagamento'}

        {selectedRow?.qtdparcelas > 0 && (
    <div className="text-gray-700">
      <span className="font-medium">Quantidade de Parcelas:</span>{' '}
      {selectedRow.qtdparcelas} parcelas
    </div>
  )}
  </div>



  {/* Container geral com reembolso à esquerda e pagamentos à direita */}
  <div className="flex justify-between gap-6">
        {/* Pagamentos normais lado direito */}
    <div className="flex gap-4 text-sm justify-start items-center flex-1">
      <div
        className={`px-3 py-1 rounded-md border ${
          pagos > 0
            ? 'bg-green-100 border-green-300 text-green-800'
            : 'bg-gray-100 border-gray-200 text-gray-600'
        } whitespace-nowrap`}
      >
        <span className="font-semibold">Pagas:</span> {pagos}
      </div>
      <div
        className={`px-3 py-1 rounded-md border ${
          adjustedNaoPagos > 0
            ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
            : 'bg-green-100 border-green-300 text-green-800'
        } whitespace-nowrap`}
      >
        <span className="font-semibold">
          {adjustedNaoPagos > 0 ? 'Não pagas:' : 'Todas pagas'}
        </span>{' '}
        {adjustedNaoPagos > 0 ? adjustedNaoPagos : '✔️'}
      </div>
    </div>
    {/* Reembolsos lado esquerdo com itens em linha */}
    {reembolsosCount > 0 && (
      <div
        className={`flex items-center gap-4 p-3 rounded-md border ${
          reembolsosNaoPagos > 0
            ? 'bg-red-50 border-red-300 text-red-800'
            : 'bg-green-50 border-green-300 text-green-800'
        } text-sm`}
      >
        <span className="font-semibold whitespace-nowrap">Reembolsos:</span>



        {reembolsosNaoPagos > 0 ? (
          <span className="rounded-md px-2 py-1 border bg-red-100 border-red-400 font-semibold whitespace-nowrap">
            Não pagos: {reembolsosNaoPagos}
          </span>
        ) : (
          <span className="rounded-md px-2 py-1 border bg-green-100 border-green-400 font-semibold whitespace-nowrap">
            Todos pagos ✔️
          </span>
        )}

        <span className="rounded-md px-2 py-1 border bg-green-100 border-green-400 font-semibold whitespace-nowrap">
          Pagos: {reembolsosPagos}
        </span>
      </div>
    )}


  </div>
</div>




</div>

            {/* Outras informações com rolagem lateral e alinhadas horizontalmente */}
    <div className="flex-1 w-full  space-y-4 p-4">
      {/* Cabeçalho com título e botão de toggle */}
      <div
        onClick={() => setIsOpenPagamentos(!isOpenPagamentos)}
        className="flex  items-center cursor-pointer select-none"
        aria-expanded={isOpenPagamentos}
        aria-controls="pagamentos-content"
      >
        <h3 className="text-xl font-semibold text-gray-700 mr-2">
          Pagamentos relacionados
        </h3>
        <svg
          className={`w-5 h-5 text-gray-500 transform transition-transform duration-300 ${
            isOpenPagamentos ? "rotate-90" : "rotate-0"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"></path>
        </svg>
      </div>

      {/* Conteúdo que pode expandir/ocultar */}
      <div
        id="pagamentos-content-wrapper"
        className={`w-full rounded-lg p-2 border border-gray-200 shadow-lg transition-all duration-500 ease-in-out hover:shadow-xl ${
          isOpenPagamentos ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        } bg-gradient-to-tr from-white via-gray-100 via-60% to-white`}
        style={{ transitionProperty: "max-height, opacity" }}
      >
        <div className="overflow-x-auto">
          <div className="flex gap-6 overflow-x-auto">
            {loading ? (
              <p>Carregando dados...</p>
            ) : additionalRows.length > 0 ? (
              additionalRows
                .slice()
                .sort((a, b) => new Date(a.venceem).getTime() - new Date(b.venceem).getTime())
                .map((row, index) => (
                  <div
                    key={index}
                    className={`flex-shrink-0 flex flex-col items-start p-6 rounded-lg shadow-md w-80 ${
                      !row.pagoem || row.pagoem === "-"
                        ? new Date() > new Date(row.venceem)
                          ? "bg-red-50 border-2 border-red-300"
                          : "bg-yellow-50 border-2 border-yellow-600"
                        : "bg-green-50 border-2 border-green-300"
                    }`}
                  >
                    {/* Cartão do boleto */}
                    <h4 className="font-semibold text-lg text-gray-700 border-b border-gray-300 pb-2">
                      Pagamento #{index + 1}
                    </h4>

                    <p className="text-sm text-gray-600 border-t pt-3 border-gray-400">
                      <strong>Forma de Pagamento:</strong> {row.formapagamento}
                    </p>

                    {!row.nparcelas ? (
                      <p className="text-sm text-gray-600 font-semibold italic pt-2 pb-2 text-green-700">
                        Pago no ato da compra
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">
                          <strong>Parcela:</strong> {row.nparcelas}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Qtd Parcelas:</strong> {row.qtdparcelas}
                        </p>
                      </>
                    )}

                    <p className="text-sm text-gray-600">
                      <strong>Valor:</strong> {formatCurrency(row.valor)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Vencimento:</strong> {formatDate(row.venceem)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Pagamento:</strong> {formatDate(row.pagoem)}
                    </p>

                    {/* Botões de ação para o boleto */}
<div className="mt-4 flex flex-wrap gap-4 justify-end items-end">
  
  {/* Se não foi pago */}
 {/* Se não foi pago */}
{!row.pagoem && (
  <>
    <button
      onClick={() => handleAddPayment(row.id, "pagar")}  // modo pagar
      disabled={loadingBoleto}
      className={`flex items-center gap-2 px-2 py-1 rounded-md text-sm 
        border border-gray-300 
        text-gray-700 hover:border-gray-500 hover:text-black 
        disabled:text-gray-400 disabled:border-gray-200 transition`}
    >
      <CreditCard size={16} />
      {loadingBoleto ? "Carregando..." : "Pagar"}
    </button>

    <button
      onClick={() => handlePrintBoleto(row.boleto, row.formaaserpago)}
      disabled={loadingBoleto}
      className={`flex items-center gap-2 px-2 py-1 rounded-md text-sm 
        border border-gray-300 
        text-gray-700 hover:border-gray-500 hover:text-black 
        disabled:text-gray-400 disabled:border-gray-200 transition`}
    >
      <Printer size={16} />
      {loadingBoleto ? "Carregando..." : "Boleto"}
    </button>
  </>
)}

{/* Se foi pago */}
{row.pagoem && (
  <>
    {row.comprovante_pagamento ? (
      <button
        onClick={() => handleViewComprovante(row.comprovante_pagamento)}
        className="flex items-center gap-2 px-2 py-1 rounded-md text-sm 
          border border-gray-300 
          text-gray-700 hover:border-gray-500 hover:text-black 
          transition"
      >
        <Eye size={16} />
        Visualizar Comprovante
      </button>
    ) : (
      <button
        onClick={() => handleAddPayment(row.id, "comprovante")}  // modo comprovante
        className="flex items-center gap-2 px-2 py-1 rounded-md text-sm 
        border border-gray-300 
        text-gray-700 hover:border-gray-500 hover:text-black 
        transition"
      >
        <UploadCloud size={16} />
        Inserir Comprovante
      </button>
    )}
  </>
)}

</div>

                  </div>
                ))
            ) : (
              <p>Nenhuma linha adicional encontrada.</p>
            )}
          </div>
        </div>
      </div>

        {/* Ações */}

    </div>

<div
  className="flex flex-wrap gap-3 justify-end relative z-50"
  id="chupa-cabra"
>
  <Button onClick={handleVerMateriais}>Ver materiais</Button>
  <Button onClick={handleOpenNotaFiscal}>Nota Fiscal</Button>
</div>


</div>


{openModal && (
  <div className="fixed top-1/2 left-1/2 w-1/2 transform -translate-x-1/2 z-50">
    <div className="bg-white border border-gray-300 p-4 rounded-md shadow-md">
      <h2 className="text-base font-semibold mb-2">Informação</h2>
      <p className="text-sm text-gray-700">{modalMessage}</p>
      <div className="flex justify-end">
        <button
          onClick={() => setOpenModal(false)}
          className="mt-3 bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 text-sm"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
)}


{openPaymentModal && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg w-96">
      <h2 className="text-lg font-semibold mb-4">
        {modalMode === "pagar" ? "Registrar Pagamento" : "Anexar Comprovante"}
      </h2>

      {/* Mostrar campo data só no modo pagar */}
      {modalMode === "pagar" && (
        <>
          <label className="block text-sm text-gray-700 mb-1">
            Data do Pagamento:
          </label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
        </>
      )}

      {/* Upload do comprovante */}
      <label className="block text-sm text-gray-700 mb-1">Comprovante:</label>
      <input
        type="file"
        className="w-full mb-4"
        onChange={(e) => setComprovanteFile(e.target.files?.[0] || null)}
      />

      {/* Ações */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setOpenPaymentModal(false)}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancelar
        </button>
        <button
          onClick={modalMode === "pagar" ? handleConfirmPayment : handleInsertComprovante}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loadingBoleto}
        >
          {loadingBoleto ? "Carregando..." : "Confirmar"}
        </button>
      </div>
    </div>
  </div>
)}

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent
    className=" w-[92%] h-[85vh] overflow-auto"
    onInteractOutside={(e) => e.preventDefault()} // <-- impede fechar clicando fora
  >
    <DialogHeader>
      <DialogTitle>Materiais</DialogTitle>
      <DialogDescription>
        Lista dos materiais associados ao código <strong>{selectedRow?.codigo}</strong>.
      </DialogDescription>
    </DialogHeader>

    <div className="border rounded-xl overflow-hidden">
      <div className="h-[70vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white z-10 shadow-sm">
            <tr>
              <th className="text-left px-4 py-2 border-b">Nome</th>
              <th className="text-left px-4 py-2 border-b">Categoria</th>
              <th className="text-left px-4 py-2 border-b">Subcategoria</th>
              <th className="text-right px-4 py-2 border-b">Qtd</th>
              <th className="text-right px-4 py-2 border-b">Valor Unitário</th>
              <th className="text-right px-4 py-2 border-b">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            {materiais.map((material, index) => (
              <tr
                key={index}
                className={`${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-gray-100 transition-colors border-b last:border-0`}
              >
                <td className="px-4 py-2">{material.nome}</td>
                <td className="px-4 py-2">{material.discriminacao}</td>
                <td className="px-4 py-2">
                  {material.subcategoria}
                </td>
                <td className="px-4 py-2 text-right">{material.qtd}</td>
                <td className="px-4 py-2 text-right">
                  R$ {Number(material.valor_unitario).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right">
                  R$ {Number(material.valor_total).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </DialogContent>
</Dialog>


      
    </div>
    


  );
};

export default RowDetailsModal;