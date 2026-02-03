/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { SupersetClient } from '@superset-ui/core';
import rison from 'rison';
import type { RoleAssignmentRequest } from './types';

type SelectOption = {
  value: number;
  label: string;
};

type SelectResponse = {
  data: SelectOption[];
  totalCount: number;
};

export const applyRoleAssignment = async (payload: RoleAssignmentRequest) => {
  const response = await SupersetClient.post({
    endpoint: '/api/v1/security/roles/assignment/',
    jsonPayload: {
      role_ids: payload.roleIds,
      action: payload.action,
      scope: payload.scope,
      user_ids: payload.userIds,
      filters: payload.filters,
    },
  });

  return response.json || {};
};

export const fetchRoleOptions = async (
  filterValue: string,
  page: number,
  pageSize: number,
  addDangerToast: (msg: string) => void,
): Promise<SelectResponse> => {
  const query = rison.encode({
    page,
    page_size: pageSize,
    order_column: 'name',
    order_direction: 'asc',
    ...(filterValue
      ? { filters: [{ col: 'name', opr: 'ct', value: filterValue }] }
      : {}),
  });

  try {
    const response = await SupersetClient.get({
      endpoint: `/api/v1/security/roles/?q=${query}`,
    });

    const results = (response.json?.result || []) as Array<{
      id: number;
      name: string;
    }>;

    return {
      data: results.map((role: any) => ({
        value: role.id,
        label: role.name,
      })),
      totalCount: response.json?.count ?? 0,
    };
  } catch (error) {
    addDangerToast('Произошла ошибка при загрузке ролей');
    return { data: [], totalCount: 0 };
  }
};

export const fetchUserOptions = async (
  resource: 'groups',
  filterValue: string,
  page: number,
  pageSize: number,
  addDangerToast: (msg: string) => void,
): Promise<SelectResponse> => {
  const query = rison.encode({
    ...(filterValue
      ? { filters: [{ col: 'name', opr: 'ct', value: filterValue }] }
      : {}),
    page,
    page_size: pageSize,
    order_column: 'name',
    order_direction: 'asc',
  });

  try {
    const response = await SupersetClient.get({
      endpoint: `/api/v1/security/${resource}/?q=${query}`,
    });

    const results = (response.json?.result || []) as Array<{
      id: number;
      name: string;
    }>;

    return {
      data: results.map((item: any) => ({
        value: item.id,
        label: item.name,
      })),
      totalCount: response.json?.count ?? 0,
    };
  } catch (error) {
    addDangerToast('Произошла ошибка при загрузке групп');
    return { data: [], totalCount: 0 };
  }
};
