# Guia: Como Configurar a Impressora de Rede

Este guia ensina como configurar uma impressora termica para imprimir comprovantes de venda via rede (Wi-Fi ou cabo de rede).

---

## Requisitos

- Impressora termica com conexao de rede (Wi-Fi ou Ethernet)
- Impressora e computador/celular na mesma rede local
- Acesso de administrador no sistema EJYM

### Impressoras Compativeis

| Marca | Modelos Populares | Conexao |
|-------|-------------------|---------|
| Epson | TM-T20X, TM-T88 | Rede/USB |
| Elgin | i9, i7 | Rede/USB |
| Bematech | MP-4200 TH | Rede/USB |
| Jetway | JP-500 | Rede/USB |
| Tanca | TP-650 | Rede/USB |

---

## Passo 1: Descobrir o IP da Impressora

Primeiro, voce precisa saber o endereco IP da sua impressora.

### Opcao A: Imprimir Pagina de Configuracao

A maioria das impressoras tem um botao para imprimir suas configuracoes:

1. Desligue a impressora
2. Segure o botao **FEED** (avanco de papel)
3. Ligue a impressora mantendo o botao pressionado
4. Solte quando comecar a imprimir

O IP aparecera na folha impressa (ex: `192.168.1.100`)

### Opcao B: Verificar no Roteador

1. Acesse a pagina do seu roteador (geralmente `192.168.1.1`)
2. Procure por "Dispositivos Conectados" ou "DHCP Clients"
3. Localize a impressora pelo nome ou MAC address

### Opcao C: Usar Software da Impressora

Muitas marcas tem software para descobrir impressoras na rede:
- **Epson**: Epson Net Config
- **Elgin**: Elgin Printer Setup
- **Bematech**: Bematech Printer Utility

---

## Passo 2: Configurar no Sistema EJYM

1. Acesse o sistema EJYM
2. Va em **Configuracoes** (icone de engrenagem no menu)
3. Role ate encontrar a secao **Impressora de Rede**

### Campos para preencher:

| Campo | O que colocar | Exemplo |
|-------|---------------|---------|
| **Ativar** | Marque para habilitar | ✓ |
| **Nome** | Nome para identificar | "Impressora Cozinha" |
| **IP** | Endereco IP da impressora | 192.168.1.100 |
| **Porta** | Porta de comunicacao (padrao 9100) | 9100 |
| **Largura** | Tamanho do papel | 80mm (mais comum) |
| **Corte automatico** | Cortar papel apos imprimir | ✓ |

---

## Passo 3: Testar a Conexao

1. Apos preencher os campos, clique em **Testar Conexao**
2. Aguarde a verificacao (pode levar alguns segundos)

### Resultados possiveis:

| Resultado | Significado | O que fazer |
|-----------|-------------|-------------|
| ✅ Conectado | Tudo certo! | Pode salvar e usar |
| ❌ Timeout | Impressora nao respondeu | Verificar IP e se esta ligada |
| ❌ IP invalido | Formato incorreto | Corrigir formato (ex: 192.168.1.100) |
| ❌ Erro de rede | Problema de conexao | Verificar se estao na mesma rede |

---

## Passo 4: Salvar e Usar

1. Clique em **Salvar Configuracoes**
2. Pronto! Agora ao imprimir uma venda, selecione **Impressora de Rede**

### Como imprimir uma venda:

1. Va em **Vendas**
2. Clique em uma venda para ver os detalhes
3. Clique no botao **Imprimir**
4. Selecione **Impressora de Rede** no menu

---

## Solucao de Problemas

### "Impressora nao encontrada"

1. **Verifique se a impressora esta ligada**
2. **Confirme o IP**: Imprima a pagina de configuracao novamente
3. **Mesma rede**: O dispositivo e a impressora devem estar na mesma rede Wi-Fi
4. **Firewall**: Desative temporariamente o firewall para testar

### "Timeout na conexao"

1. A impressora pode estar ocupada - aguarde e tente novamente
2. Verifique se a porta 9100 esta correta
3. Reinicie a impressora

### "Imprimiu caracteres estranhos"

1. Verifique se a largura do papel esta correta (58mm ou 80mm)
2. A impressora pode nao suportar comandos ESC/POS

### "Nao aparece a opcao de impressora de rede"

1. Somente administradores podem configurar
2. Verifique se a configuracao foi salva corretamente

---

## Configuracao de IP Fixo (Recomendado)

Para evitar que o IP mude, configure um IP fixo na impressora:

### Via software da impressora:

1. Conecte a impressora via USB
2. Abra o software de configuracao da marca
3. Defina um IP fixo fora da faixa DHCP do roteador
   - Exemplo: Se o roteador usa 192.168.1.100-200, use 192.168.1.50
4. Salve e reinicie a impressora

### Via roteador (Reserva DHCP):

1. Acesse a pagina do roteador
2. Va em configuracoes de DHCP
3. Adicione uma "reserva" para o MAC da impressora
4. Associe um IP fixo

---

## Portas Comuns

| Porta | Uso |
|-------|-----|
| 9100 | RAW (mais comum para termicas) |
| 515 | LPR/LPD |
| 631 | IPP (Internet Printing Protocol) |

A maioria das impressoras termicas usa a **porta 9100**.

---

## Duvidas Frequentes

### Posso usar mais de uma impressora?

Atualmente o sistema suporta uma impressora de rede por empresa. Para multiplas impressoras, considere usar impressoras Bluetooth ou configurar na mesma rede.

### Funciona com impressora USB?

Nao diretamente. Para USB, use a opcao **Impressora do Sistema** que usa a impressora configurada no Windows/Mac.

### Funciona no celular?

Sim! Desde que o celular esteja na mesma rede Wi-Fi que a impressora.

### A impressora precisa ficar ligada o tempo todo?

Sim, a impressora precisa estar ligada e conectada a rede para receber os comandos de impressao.

---

## Suporte

Se precisar de ajuda adicional:

1. Verifique o manual da sua impressora
2. Entre em contato com o suporte tecnico do fabricante
3. Acesse nossa central de ajuda

---

*Ultima atualizacao: Janeiro 2026*
