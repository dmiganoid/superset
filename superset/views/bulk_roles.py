# superset/views/bulk_role.py
from flask import request, jsonify, redirect
from flask_appbuilder import BaseView, expose
from flask_appbuilder.security.sqla.models import User, Role
from superset import db
from sqlalchemy import or_
import json
from superset.views.base import common_bootstrap_payload
from superset.utils import core as utils
from superset.views.base import BaseSupersetView

class BulkRoleView(BaseSupersetView):
    route_base = "/bulkrole"
    default_view = "panel"

    # --- 1. API для поиска пользователей (для выпадающего списка) ---
    @expose('/api/search_users/', methods=['GET'])
    def search_users(self):
        # 1. Получаем параметры (по умолчанию None или пустая строка)
        username = request.args.get('username', '')
        first_name = request.args.get('first_name', '')
        last_name = request.args.get('last_name', '')
        email = request.args.get('email', '')
        role_filter = request.args.get('role_id', '')
        
        # Если вообще нет фильтров - возвращаем пустоту (чтобы не грузить базу)
        if not any([username, first_name, last_name, email, role_filter]):
             return jsonify({"options": []})

        query = db.session.query(User)

        # 2. Фильтр по роли (если выбрана)
        if role_filter:
            query = query.join(User.roles).filter(Role.id == role_filter)

        # 3. Точечные фильтры (цепочка AND)
        # ilike делает поиск нечувствительным к регистру (Dima == dima)
        if username:
            query = query.filter(User.username.ilike(f'%{username}%'))
        
        if first_name:
            query = query.filter(User.first_name.ilike(f'%{first_name}%'))
            
        if last_name:
            query = query.filter(User.last_name.ilike(f'%{last_name}%'))
            
        if email:
            query = query.filter(User.email.ilike(f'%{email}%'))

        # Лимит 100, чтобы интерфейс не завис от тысяч записей
        users = query.limit(100).all()

        options = [
            {
                "label": f"{u.first_name} {u.last_name} ({u.username}) | {u.email}", 
                "value": u.id
            } 
            for u in users
        ]
        return jsonify({"options": options})

    # --- 2. API получения ролей (оставляем как было) ---
    @expose('/api/roles/', methods=['GET'])
    def get_roles(self):
        roles = db.session.query(Role).all()
        return jsonify({
            "result": [{"label": r.name, "value": r.id} for r in roles]
        })

    # --- 3. API выдачи (теперь принимает список ID) ---
    @expose('/api/assign/', methods=['POST'])
    def assign(self):
        data = request.get_json() or {}
        role_id = data.get('role_id')
        user_ids = data.get('user_ids', []) # Ждем массив ID

        if not role_id or not user_ids:
            return jsonify({"error": "Выберите роль и хотя бы одного пользователя"}), 400

        role = db.session.query(Role).filter_by(id=role_id).first()
        if not role:
            return jsonify({"error": "Role not found"}), 404

        count = 0
        # Ищем сразу всех юзеров по списку ID
        users = db.session.query(User).filter(User.id.in_(user_ids)).all()

        for user in users:
            if role not in user.roles:
                user.roles.append(role)
                db.session.merge(user)
                count += 1
        
        db.session.commit()
        return jsonify({"message": "OK", "count": count})

    @expose('/api/unassign/', methods=['POST'])
    def unassign(self):
        data = request.get_json() or {}
        role_id = data.get('role_id')
        user_ids = data.get('user_ids', [])

        if not role_id or not user_ids:
            return jsonify({"error": "Выберите роль и пользователей"}), 400

        role = db.session.query(Role).filter_by(id=role_id).first()
        if not role:
            return jsonify({"error": "Role not found"}), 404

        # Загружаем пользователей
        users = db.session.query(User).filter(User.id.in_(user_ids)).all()
        
        count = 0
        for user in users:
            # Если у пользователя есть эта роль - убираем её
            if role in user.roles:
                user.roles.remove(role)
                db.session.merge(user)
                count += 1
        
        db.session.commit()
        return jsonify({"message": "OK", "count": count})


    @expose("/panel/")
    @expose("/panel")
    def panel(self):
        return self.render_app_template()