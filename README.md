# MAISUMBURACOMACEIO

Mapeamento de buracos, vazamentos e alagamentos em Maceió em tempo real.

![Maceió](https://www.infoescola.com/wp-content/uploads/2017/04/maceio-al-140669145.jpg)

---

## Sobre o Projeto

O **MAISUMBURACOMACEIO** é uma aplicação web colaborativa que tem como objetivo mapear e monitorar problemas urbanos na cidade de Maceió, Alagoas.  
A plataforma permite que os cidadãos reportem ocorrências como buracos na via, vazamentos de água e bueiros entupidos, fornecendo dados importantes para a gestão pública e para a comunidade.

Além do mapeamento de problemas, o projeto tem como visão futura incorporar **previsão de alagamentos**, utilizando dados meteorológicos e históricos para alertar a população em tempo real.

---

## Funcionalidades Atuais

- **Mapa Interativo:** Visualização de ocorrências em um mapa da cidade, utilizando a biblioteca Leaflet.js.
- **Geolocalização:** Obtenção automática da localização do usuário para facilitar o relato de problemas.
- **Relato de Problemas:** Formulário simples para que os usuários possam reportar ocorrência, tipo e descrição do problema.
- **Backend Básico:** Servidor em Python com Flask para receber e armazenar os relatos em um arquivo JSON.
- **Layout Responsivo:** Design adaptado para funcionar bem em diferentes tamanhos de tela (desktop e mobile).

---

## Estrutura do Projeto

- **`index.html`** — Estrutura visual (frontend).
- **`style.css`** — Estilos da interface.
- **`script.js`** — Lógica do frontend (mapa, geolocalização e envio de formulário).
- **`server.py`** — Backend com Flask para gerenciar a API.
- **`reports.json`** — Banco de dados temporário em formato JSON.

---

## Como Executar o Projeto

### Pré-requisitos
- **Python** instalado no sistema.

---

### Passo 1
**Clonar o repositório**
```bash
git clone https://github.com/gallothiago/maisumburaco.git
cd MAISUMBURACOMACEIO
```

---

### Passo 2
**Configurar o ambiente virtual**
```bash
# Criar ambiente virtual
python -m venv venv

# Ativar no Windows
venv\Scripts\activate

# Ativar no macOS/Linux
source venv/bin/activate
```

---

### Passo 3
**Instalar dependências**
```bash
pip install -r requirements.txt
```

---

### Passo 4
**Iniciar a aplicação**
```bash
python server.py
```

O servidor estará disponível em:  
[http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## Contribuições
Contribuições são sempre bem-vindas!  
Se você tiver ideias para melhorias, novas funcionalidades ou correções de bugs, abra uma **issue** ou envie um **pull request**.

---

## Licença
Este projeto está licenciado sob a **Licença MIT**.



