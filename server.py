import os
import json
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__)

# Nome do arquivo que atuará como nosso "banco de dados"
# Ele irá armazenar os relatos de problemas
REPORTS_FILE = 'reports.json'

# Função para carregar os relatos do arquivo JSON
def load_reports():
    if not os.path.exists(REPORTS_FILE) or os.stat(REPORTS_FILE).st_size == 0:
        return []
    with open(REPORTS_FILE, 'r') as f:
        return json.load(f)

# Função para salvar os relatos no arquivo JSON
def save_reports(reports):
    with open(REPORTS_FILE, 'w') as f:
        json.dump(reports, f, indent=4)

# Rota para a página principal (index.html)
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# Rota para servir arquivos estáticos (CSS, JS)
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# Rota da API para receber novos relatos de problemas
@app.route('/api/report', methods=['POST'])
def handle_report():
    try:
        data = request.json
        if not data or 'latitude' not in data or 'longitude' not in data:
            return jsonify({'error': 'Dados inválidos'}), 400

        reports = load_reports()
        reports.append(data)
        save_reports(reports)

        print("Novo relato recebido e salvo:", data)
        return jsonify({'message': 'Relato recebido com sucesso!', 'report_id': len(reports)}), 201

    except Exception as e:
        print(f"Erro ao processar o relato: {e}")
        return jsonify({'error': 'Erro interno do servidor'}), 500

# Rota da API para obter todos os relatos existentes
@app.route('/api/reports', methods=['GET'])
def get_reports():
    reports = load_reports()
    return jsonify(reports)

if __name__ == '__main__':
    # Usar o modo de depuração para facilitar o desenvolvimento
    app.run(debug=True)