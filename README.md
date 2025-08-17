# MAISUMBURACOMACEIO

Aplicação web para mapeamento colaborativo de problemas urbanos, análise de dados e previsão de alagamentos em Maceió, Alagoas.

![Maceió]([https://www.infoescola.com/wp-content/uploads/2017/04/maceio-al-140669145.jpg](https://assets.brasildefato.com.br/2024/09/image_processing20200201-29235-1af4kg2.jpg))

---

## Sobre o Projeto

O **MAISUMBURACOMACEIO** é uma aplicação web completa que visa mapear, monitorar e prever problemas urbanos na cidade de Maceió. A plataforma permite que os cidadãos reportem ocorrências como buracos na via e bueiros entupidos, fornecendo dados em tempo real para a comunidade.

O sistema evoluiu para incluir uma camada de inteligência, utilizando dados meteorológicos e o histórico de ocorrências para **gerar alertas preditivos de alagamento**. Adicionalmente, a aplicação automatiza a comunicação com órgãos públicos através do **envio de relatórios periódicos por e-mail**, criando uma ponte proativa entre a população e a gestão da cidade.

---

## Funcionalidades Principais

- **Navegação Multi-página:** Interface organizada em seções distintas: Página Inicial, Reportar um Problema, Verificar Rota e Ocorrências Resolvidas.
- **Mapa Interativo (Google Maps):** Visualização de todas as ocorrências e alertas de alagamento em um mapa da cidade, utilizando a API do Google Maps.
- **Relato de Problemas Inteligente:** Os usuários podem reportar ocorrências clicando no mapa ou através de um campo de endereço com autopreenchimento (Google Places API).
- **Análise de Rotas:** Funcionalidade para traçar uma rota entre dois pontos e visualizar os problemas urbanos existentes nesse trajeto.
- **Previsão de Alagamentos:** Um sistema de backend que roda em segundo plano, cruza dados da API de meteorologia (OpenWeatherMap) com relatos de vulnerabilidade (ex: bueiros entupidos) e gera alertas de risco de alagamento, que são exibidos no mapa como zonas de perigo.
- **Relatórios Automáticos por E-mail:** Envio periódico e automático de um relatório formatado em HTML para um e-mail pré-configurado (ex: secretaria de infraestrutura), contendo todas as ocorrências ativas no sistema.
- **Ciclo de Vida das Ocorrências:**
    - Relatos podem ser marcados como "Resolvidos", sendo movidos para uma página de arquivo.
    - É possível desfazer uma resolução, retornando a ocorrência para a lista principal.
    - Ocorrências resolvidas são excluídas permanentemente após 7 dias para manter a base de dados limpa.
- **Backend Robusto com Banco de Dados:** Servidor em Python com Flask e persistência de dados em um banco de dados SQLite gerenciado por SQLAlchemy.

---

## Tecnologias Utilizadas

- **Backend**: Python, Flask, Flask-SQLAlchemy, APScheduler, Flask-Mail
- **Frontend**: HTML5, CSS3, JavaScript
- **Banco de Dados**: SQLite
- **APIs Externas**: Google Maps Platform (Maps, Places, Directions, Geometry), OpenWeatherMap, SendGrid

---

## Estrutura do Projeto

O projeto segue a estrutura padrão de aplicações Flask para garantir organização e escalabilidade.

- **`server.py`**: Aplicação principal do Flask, com todas as rotas de páginas e da API.
- **`static/`**: Contém os arquivos estáticos.
  - **`css/style.css`**: Folha de estilos profissional e responsiva.
  - **`js/script.js`**: Lógica do frontend para todas as páginas.
- **`templates/`**: Contém os templates HTML.
  - **`base.html`**: Estrutura principal com cabeçalho, menu e rodapé.
  - **`index.html`**: Página inicial com mapa, lista de ocorrências e previsão do tempo.
  - **`report.html`**: Página para o registro de novas ocorrências.
  - **`route.html`**: Página para a análise de rotas.
  - **`resolved.html`**: Página para listar as ocorrências resolvidas.
  - **`daily_report.html`**: Template para o e-mail automático.
- **`reports.db`**: Arquivo do banco de dados SQLite.
- **`.env`**: Arquivo para armazenar as chaves de API e outras configurações sensíveis.

---

## Como Executar o Projeto

### Pré-requisitos
- **Python** e **pip** instalados no sistema.

### Passo 1: Configuração do Ambiente
Antes de rodar o projeto, é crucial configurar as chaves de API.

1.  **Crie o arquivo `.env`**: Na raiz do projeto, crie um arquivo chamado `.env`.
2.  **Preencha as variáveis**: Copie o conteúdo abaixo para o seu `.env` e substitua os valores pelas suas chaves e e-mails.

    ```
    # Chave da API do Google Cloud Platform
    GOOGLE_MAPS_API_KEY=SUA_CHAVE_DO_GOOGLE_MAPS

    # Chave da API da OpenWeatherMap
    OPENWEATHER_API_KEY=SUA_CHAVE_DA_OPENWEATHERMAP

    # Chave da API do SendGrid
    SENDGRID_API_KEY=SUA_CHAVE_DO_SENDGRID

    # E-mail verificado no SendGrid que enviará os relatórios
    MAIL_DEFAULT_SENDER=seu-email-verificado@exemplo.com

    # E-mail que receberá os relatórios automáticos
    RECIPIENT_EMAIL=email-da-secretaria@exemplo.com
    ```

### Passo 2: Clonar e Preparar

#### Clonar o repositório (se ainda não o fez)
git clone [https://github.com/gallothiago/maisumburaco](https://github.com/gallothiago/maisumburaco)
cd nome-do-repositorio

#### Criar ambiente virtual
python -m venv venv

#### Ativar no Windows
venv\Scripts\activate

#### Ativar no macOS/Linux
source venv/bin/activate

---

### Passo 3: Instalar Dependências
pip install -r requirements.txt

### Passo 4: Iniciar a Aplicação
python server.py

## O servidor estará disponível em:
http://127.0.0.1:5000

---

### Contribuições
Contribuições são sempre bem-vindas! Se você tiver ideias para melhorias, novas funcionalidades ou correções de bugs, abra uma issue ou envie um pull request.

### Licença
Este projeto está licenciado sob a Licença MIT.

