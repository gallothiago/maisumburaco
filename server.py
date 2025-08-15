import os
import json
import uuid
import requests
import pytz
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from flask_mail import Mail, Message

# --- Configuração Inicial ---
load_dotenv()
app = Flask(__name__, static_folder='static', template_folder='templates')

# --- Configuração do Banco de Dados ---
db_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'reports.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Configuração do Flask-Mail ---
app.config['MAIL_SERVER'] = 'smtp.sendgrid.net'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'apikey'
app.config['MAIL_PASSWORD'] = os.getenv('SENDGRID_API_KEY')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')
mail = Mail(app)

# --- Modelos do Banco de Dados ---
class Report(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    def to_dict(self):
        maceio_tz = pytz.timezone('America/Maceio')
        local_timestamp = self.timestamp.replace(tzinfo=pytz.utc).astimezone(maceio_tz)
        return { 'id': self.id, 'type': self.type, 'description': self.description, 'latitude': self.latitude, 'longitude': self.longitude, 'address': self.address, 'timestamp': local_timestamp.isoformat() }

class ResolvedReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    original_id = db.Column(db.String(36), nullable=False, unique=True)
    type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    resolved_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    def to_dict(self):
        maceio_tz = pytz.timezone('America/Maceio')
        local_timestamp = self.timestamp.replace(tzinfo=pytz.utc).astimezone(maceio_tz)
        local_resolved_at = self.resolved_at.replace(tzinfo=pytz.utc).astimezone(maceio_tz)
        return { 'id': self.id, 'original_id': self.original_id, 'type': self.type, 'description': self.description, 'latitude': self.latitude, 'longitude': self.longitude, 'address': self.address, 'timestamp': local_timestamp.isoformat(), 'resolved_at': local_resolved_at.isoformat() }

class FloodAlert(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    risk_level = db.Column(db.String(50), nullable=False)
    generated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    report_id = db.Column(db.String(36), db.ForeignKey('report.id'), nullable=False)
    report = db.relationship('Report', backref=db.backref('alerts', lazy=True))
    def to_dict(self):
        maceio_tz = pytz.timezone('America/Maceio')
        local_timestamp = self.generated_at.replace(tzinfo=pytz.utc).astimezone(maceio_tz)
        return { 'id': self.id, 'latitude': self.latitude, 'longitude': self.longitude, 'risk_level': self.risk_level, 'generated_at': local_timestamp.isoformat(), 'address': self.report.address }

# --- Tarefas Agendadas ---
def run_flood_risk_analysis():
    with app.app_context():
        print(f"[{datetime.now()}] Executando análise de risco de alagamento...")
        RAIN_THRESHOLD_MM = 5.0
        VULNERABLE_REPORT_TYPE = 'entupimento'
        api_key = os.getenv('OPENWEATHER_API_KEY')
        if not api_key:
            print("AVISO: Chave da OpenWeather não encontrada. Análise pulada.")
            return
        lat, lon = -9.6658, -35.7351
        url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        try:
            response = requests.get(url)
            response.raise_for_status()
            weather_data = response.json()
        except requests.exceptions.RequestException as e:
            print(f"ERRO: Falha ao buscar dados de meteorologia: {e}")
            return
        vulnerable_reports = Report.query.filter_by(type=VULNERABLE_REPORT_TYPE).all()
        if not vulnerable_reports:
            print("Nenhum ponto vulnerável ('entupimento') encontrado. Análise concluída.")
            return
        FloodAlert.query.delete()
        for forecast in weather_data['list'][:4]:
            rain_in_3h = forecast.get('rain', {}).get('3h', 0)
            if rain_in_3h >= RAIN_THRESHOLD_MM:
                forecast_time = datetime.fromtimestamp(forecast['dt'])
                print(f"ALERTA DE CHUVA FORTE ({rain_in_3h}mm) prevista para as {forecast_time.strftime('%H:%M')}.")
                for report in vulnerable_reports:
                    existing_alert = FloodAlert.query.filter_by(report_id=report.id).first()
                    if not existing_alert:
                        new_alert = FloodAlert(latitude=report.latitude, longitude=report.longitude, risk_level='Alto', report_id=report.id)
                        db.session.add(new_alert)
                        print(f"  -> Gerando alerta de risco ALTO para o endereço: {report.address}")
        db.session.commit()
        print("Análise de risco de alagamento concluída.")

def send_aggregated_report_email():
    with app.app_context():
        print(f"[{datetime.now()}] Verificando a necessidade de enviar o relatório agregado...")
        all_new_reports = Report.query.order_by(Report.timestamp.asc()).all()
        if not all_new_reports:
            print("Nenhuma ocorrência para reportar. E-mail não enviado.")
            return
        recipient_email = os.getenv('RECIPIENT_EMAIL')
        if not recipient_email:
            print("AVISO: RECIPIENT_EMAIL não configurado. E-mail não enviado.")
            return
        maceio_tz = pytz.timezone('America/Maceio')
        for report in all_new_reports:
            report.timestamp = report.timestamp.replace(tzinfo=pytz.utc).astimezone(maceio_tz)
        report_time_str = datetime.now(maceio_tz).strftime("%d/%m/%Y %H:%M")
        msg = Message(
            subject=f"Relatório de Ocorrências Urbanas - {report_time_str}",
            recipients=[recipient_email]
        )
        msg.html = render_template('daily_report.html', reports=all_new_reports, report_date=report_time_str)
        try:
            mail.send(msg)
            print(f"Relatório agregado com {len(all_new_reports)} ocorrência(s) enviado para {recipient_email}.")
        except Exception as e:
            print(f"ERRO ao enviar e-mail: {e}")

def cleanup_old_resolved_reports():
    with app.app_context():
        print(f"[{datetime.now()}] Executando limpeza de relatos resolvidos antigos...")
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        reports_to_delete = ResolvedReport.query.filter(ResolvedReport.resolved_at <= seven_days_ago).all()
        if reports_to_delete:
            count = len(reports_to_delete)
            for report in reports_to_delete:
                db.session.delete(report)
            db.session.commit()
            print(f"{count} relato(s) resolvido(s) antigo(s) foram excluídos permanentemente.")
        else:
            print("Nenhum relato resolvido antigo para limpar.")

# --- Rotas das Páginas ---
@app.route('/')
def index(): return render_template('index.html')
@app.route('/reportar')
def report_page(): return render_template('report.html')
@app.route('/rota')
def route_page(): return render_template('route.html')
@app.route('/resolvidas')
def resolved_page():
    return render_template('resolved.html')

# --- ROTAS DA API ---
@app.route('/api/config', methods=['GET'])
def get_config():
    api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    return jsonify({'googleMapsApiKey': api_key})
@app.route('/api/weather', methods=['GET'])
def get_weather():
    api_key = os.getenv('OPENWEATHER_API_KEY')
    lat, lon = -9.6658, -35.7351
    url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={api_key}&units=metric&lang=pt_br"
    try:
        response = requests.get(url)
        response.raise_for_status()
        weather_data = response.json()
        processed_data = {'city': weather_data['city']['name'], 'forecasts': []}
        for forecast in weather_data['list'][:5]:
            processed_data['forecasts'].append({'time': forecast['dt_txt'], 'temp': forecast['main']['temp'], 'description': forecast['weather'][0]['description'], 'icon': forecast['weather'][0]['icon'], 'rain_mm': forecast.get('rain', {}).get('3h', 0)})
        return jsonify(processed_data)
    except requests.exceptions.RequestException as e:
        if e.response is not None: return jsonify({'error': f'Falha ao buscar dados: {e.response.status_code} {e.response.reason}'}), e.response.status_code
        return jsonify({'error': f'Falha de conexão: {e}'}), 502
@app.route('/api/flood-alerts', methods=['GET'])
def get_flood_alerts():
    alerts = FloodAlert.query.all()
    return jsonify([alert.to_dict() for alert in alerts])
@app.route('/api/reports', methods=['GET'])
def get_reports():
    all_reports = Report.query.order_by(Report.timestamp.desc()).all()
    return jsonify([report.to_dict() for report in all_reports])
@app.route('/api/report', methods=['POST'])
def handle_report():
    try:
        data = request.json
        if not data or 'latitude' not in data: return jsonify({'error': 'Dados inválidos'}), 400
        new_report = Report(type=data['type'], description=data['description'], latitude=data['latitude'], longitude=data['longitude'], address=data.get('address'))
        db.session.add(new_report)
        db.session.commit()
        return jsonify({'message': 'Relato recebido.'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Ocorreu um erro interno ao salvar o relato.'}), 500

@app.route('/api/report/<string:report_id>', methods=['DELETE'])
def delete_report(report_id):
    report_to_delete = Report.query.get(report_id)
    if report_to_delete:
        db.session.delete(report_to_delete)
        db.session.commit()
        return jsonify({'message': 'Relato excluído.'}), 200
    return jsonify({'error': 'Relato não encontrado.'}), 404

@app.route('/api/report/resolve/<string:report_id>', methods=['POST'])
def resolve_report(report_id):
    report_to_resolve = Report.query.get(report_id)
    if report_to_resolve:
        resolved = ResolvedReport(original_id=report_to_resolve.id, type=report_to_resolve.type, description=report_to_resolve.description, latitude=report_to_resolve.latitude, longitude=report_to_resolve.longitude, address=report_to_resolve.address, timestamp=report_to_resolve.timestamp)
        db.session.add(resolved)
        db.session.delete(report_to_resolve)
        db.session.commit()
        return jsonify({'message': 'Ocorrência movida para resolvidos.'}), 200
    return jsonify({'error': 'Ocorrência não encontrada.'}), 404
@app.route('/api/reports/resolved', methods=['GET'])
def get_resolved_reports():
    resolved_reports = ResolvedReport.query.order_by(ResolvedReport.resolved_at.desc()).all()
    return jsonify([report.to_dict() for report in resolved_reports])
@app.route('/api/report/undo/<int:resolved_id>', methods=['POST'])
def undo_resolved_report(resolved_id):
    resolved_to_undo = ResolvedReport.query.get(resolved_id)
    if resolved_to_undo:
        report = Report(id=resolved_to_undo.original_id, type=resolved_to_undo.type, description=resolved_to_undo.description, latitude=resolved_to_undo.latitude, longitude=resolved_to_undo.longitude, address=resolved_to_undo.address, timestamp=resolved_to_undo.timestamp)
        db.session.add(report)
        db.session.delete(resolved_to_undo)
        db.session.commit()
        return jsonify({'message': 'Ocorrência restaurada.'}), 200
    return jsonify({'error': 'Ocorrência resolvida não encontrada.'}), 404
@app.route('/api/report/resolved/<int:resolved_id>', methods=['DELETE'])
def delete_resolved_report_permanently(resolved_id):
    report_to_delete = ResolvedReport.query.get(resolved_id)
    if report_to_delete:
        db.session.delete(report_to_delete)
        db.session.commit()
        return jsonify({'message': 'Ocorrência excluída permanentemente.'}), 200
    return jsonify({'error': 'Ocorrência resolvida não encontrada.'}), 404

# --- Inicialização ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    scheduler = BackgroundScheduler(daemon=True, timezone='America/Maceio')
    scheduler.add_job(run_flood_risk_analysis, 'interval', hours=1)
    scheduler.add_job(send_aggregated_report_email, 'interval', hours=24)
    scheduler.add_job(cleanup_old_resolved_reports, trigger='cron', hour=3, minute=0)
    scheduler.start()
    print("Agendador de tarefas iniciado.")
    app.run(debug=True, use_reloader=False)