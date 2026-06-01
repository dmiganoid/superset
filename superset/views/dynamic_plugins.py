# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
from typing import Optional

from flask import jsonify, make_response, Response
from flask_appbuilder import expose, ModelView, permission_name
from flask_appbuilder.hooks import before_request
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.decorators import has_access
from flask_babel import lazy_gettext as _

from superset import is_feature_enabled
from superset.constants import MODEL_API_RW_METHOD_PERMISSION_MAP
from superset.extensions import db
from superset.models.dynamic_plugins import DynamicPlugin


class DynamicPluginsView(ModelView):
    """Dynamic plugin crud views -- To be replaced by fancy react UI"""

    route_base = "/dynamic-plugins"
    datamodel = SQLAInterface(DynamicPlugin)
    class_permission_name = "DynamicPlugin"

    method_permission_name = MODEL_API_RW_METHOD_PERMISSION_MAP

    add_columns = ["name", "key", "bundle_url"]
    edit_columns = add_columns
    show_columns = add_columns + ["id"]
    list_columns = show_columns

    label_columns = {"name": "Name", "key": "Key", "bundle_url": "Bundle URL"}

    description_columns = {
        "name": _("A human-friendly name"),
        "key": _(
            "Used internally to identify the plugin. "
            "Should be set to the package name from the pluginʼs package.json"
        ),
        "bundle_url": _(
            "A full URL pointing to the location "
            "of the built plugin (could be hosted on a CDN for example)"
        ),
    }

    list_title = _("Custom Plugins")
    show_title = _("Custom Plugin")
    add_title = _("Add a Plugin")
    edit_title = _("Edit Plugin")

    @before_request
    def ensure_dynamic_plugins_enabled(self) -> Optional[Response]:
        if not is_feature_enabled("DYNAMIC_PLUGINS"):
            return make_response("Not found", 404)
        return None

    @expose("/api/read", methods=("GET",))
    @has_access
    @permission_name("list")
    def read(self) -> Response:
        """Return dynamic plugin metadata consumed by the frontend loader."""
        plugins = db.session.query(DynamicPlugin).all()
        return jsonify(
            {
                "result": [
                    {
                        "id": plugin.id,
                        "name": plugin.name,
                        "key": plugin.key,
                        "bundle_url": plugin.bundle_url,
                    }
                    for plugin in plugins
                ],
            }
        )
