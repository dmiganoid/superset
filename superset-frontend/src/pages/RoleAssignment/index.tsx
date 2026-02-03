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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '@superset-ui/core';
import {
  Button,
  FormItem,
  Form,
  Row,
  Col,
  Select,
  Typography,
} from '@superset-ui/core/components';
import SubMenu from 'src/features/home/SubMenu';
import { useListViewResource } from 'src/views/CRUD/hooks';
import {
  ListView,
  type ListViewFilters,
  ListViewFilterOperator,
  type ListViewProps,
} from 'src/components';
import type {
  InternalFilter,
  InnerFilterValue,
} from 'src/components/ListView/types';
import { fetchPaginatedData } from 'src/utils/fetchOptions';
import { useToasts } from 'src/components/MessageToasts/withToasts';
import type {
  RoleAssignmentAction,
  RoleAssignmentFilter,
  RoleOption,
  UserOption,
} from './types';
import {
  applyRoleAssignment,
  fetchRoleOptions,
  fetchUserOptions,
} from './utils';

const PAGE_SIZE = 25;

function RoleAssignment() {
  const { addDangerToast, addSuccessToast } = useToasts();
  const {
    state: {
      loading,
      resourceCount: usersCount,
      resourceCollection: users,
      bulkSelectEnabled,
    },
    fetchData,
    refreshData,
    toggleBulkSelect,
  } = useListViewResource<UserOption>(
    'security/users',
    t('User'),
    addDangerToast,
  );

  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [action, setAction] = useState<RoleAssignmentAction>('add');
  const [currentFilters, setCurrentFilters] = useState<InternalFilter[]>([]);

  const fetchRoles = useCallback(() => {
    fetchPaginatedData({
      endpoint: '/api/v1/security/roles/',
      setData: setRoleOptions,
      setLoadingState: setLoadingRoles,
      loadingKey: 'roles',
      addDangerToast,
      errorMessage: t('Error while fetching roles'),
    });
  }, [addDangerToast]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const isActionDisabled = selectedRoles.length === 0;

  const isSelectOption = (
    value: InnerFilterValue,
  ): value is { label: string; value: string | number } =>
    Boolean(
      value &&
        typeof value === 'object' &&
        'value' in value &&
        'label' in value,
    );

  const isSupportedFilterValue = (
    value: InnerFilterValue,
  ): value is RoleAssignmentFilter['value'] => {
    if (value === undefined || value === null) {
      return false;
    }
    if (Array.isArray(value)) {
      const allStrings = value.every(item => typeof item === 'string');
      const allNumbers = value.every(item => typeof item === 'number');
      return allStrings || allNumbers;
    }
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    );
  };

  const buildFilterPayload = (): RoleAssignmentFilter[] =>
    currentFilters
      .map(filter => {
        const value = isSelectOption(filter.value)
          ? filter.value.value
          : filter.value;

        if (!isSupportedFilterValue(value)) {
          return null;
        }

        if (typeof value === 'string' && value.length === 0) {
          return null;
        }

        return {
          col: filter.id,
          opr: filter.operator || ListViewFilterOperator.Equals,
          value,
        };
      })
      .filter((item): item is RoleAssignmentFilter => item !== null);

  const handleAssignFiltered = async () => {
    if (isActionDisabled) {
      addDangerToast('Выберите хотя бы одну роль.');
      return;
    }

    try {
      const payload = {
        roleIds: selectedRoles,
        action,
        scope: 'filtered' as const,
        filters: buildFilterPayload(),
      };

      const result = await applyRoleAssignment(payload);
      addSuccessToast(
        `Обновлено пользователей: ${result.affected_users ?? 0}`,
      );
      refreshData();
    } catch (error) {
      addDangerToast('Произошла ошибка при обновлении ролей.');
    }
  };

  const handleAssignSelected = async (selected: UserOption[]) => {
    if (isActionDisabled) {
      addDangerToast('Выберите хотя бы одну роль.');
      return;
    }
    const userIds = selected.map(user => user.id);
    if (userIds.length === 0) return;

    try {
      const result = await applyRoleAssignment({
        roleIds: selectedRoles,
        action,
        scope: 'selected',
        userIds,
      });
      addSuccessToast(
        `Обновлено пользователей: ${result.affected_users ?? 0}`,
      );
      refreshData();
    } catch (error) {
      addDangerToast('Произошла ошибка при обновлении ролей.');
    }
  };

  const filters: ListViewFilters = useMemo(
    () => [
      {
        Header: t('First name'),
        key: 'first_name',
        id: 'first_name',
        input: 'search',
        operator: ListViewFilterOperator.Contains,
      },
      {
        Header: t('Last name'),
        key: 'last_name',
        id: 'last_name',
        input: 'search',
        operator: ListViewFilterOperator.Contains,
      },
      {
        Header: t('Username'),
        key: 'username',
        id: 'username',
        input: 'search',
        operator: ListViewFilterOperator.Contains,
      },
      {
        Header: t('Email'),
        key: 'email',
        id: 'email',
        input: 'search',
        operator: ListViewFilterOperator.Contains,
      },
      {
        Header: t('Is active?'),
        key: 'active',
        id: 'active',
        input: 'select',
        operator: ListViewFilterOperator.Equals,
        unfilteredLabel: t('All'),
        selects: [
          { label: t('Yes'), value: true },
          { label: t('No'), value: false },
        ],
      },
      {
        Header: t('Roles'),
        key: 'roles',
        id: 'roles',
        input: 'select',
        operator: ListViewFilterOperator.RelationManyMany,
        unfilteredLabel: t('All'),
        fetchSelects: async (filterValue, page, pageSize) =>
          fetchRoleOptions(filterValue, page, pageSize, addDangerToast),
      },
      {
        Header: t('Groups'),
        key: 'groups',
        id: 'groups',
        input: 'select',
        operator: ListViewFilterOperator.RelationManyMany,
        unfilteredLabel: t('All'),
        fetchSelects: async (filterValue, page, pageSize) =>
          fetchUserOptions('groups', filterValue, page, pageSize, addDangerToast),
      },
    ],
    [addDangerToast],
  );

  type CellProps = { row: { original: UserOption } };

  const columns = useMemo(
    () => [
      {
        accessor: 'first_name',
        id: 'first_name',
        Header: t('First name'),
        Cell: ({ row: { original } }: CellProps) => original.first_name,
      },
      {
        accessor: 'last_name',
        id: 'last_name',
        Header: t('Last name'),
        Cell: ({ row: { original } }: CellProps) => original.last_name,
      },
      {
        accessor: 'username',
        id: 'username',
        Header: t('Username'),
        Cell: ({ row: { original } }: CellProps) => original.username,
      },
      {
        accessor: 'email',
        id: 'email',
        Header: t('Email'),
        Cell: ({ row: { original } }: CellProps) => original.email,
      },
      {
        accessor: 'active',
        id: 'active',
        Header: t('Is active?'),
        hidden: true,
        Cell: ({ row: { original } }: CellProps) => original.active,
      },
      {
        accessor: 'roles',
        id: 'roles',
        Header: t('Roles'),
        hidden: true,
        Cell: ({ row: { original } }: CellProps) => original.roles,
      },
      {
        accessor: 'groups',
        id: 'groups',
        Header: t('Groups'),
        hidden: true,
        Cell: ({ row: { original } }: CellProps) => original.groups,
      },
    ],
    [],
  );

  const bulkActions: ListViewProps['bulkActions'] = [
    {
      key: 'assign',
      name: 'Применить к выбранным',
      type: 'primary',
      onSelect: handleAssignSelected,
    },
  ];

  return (
    <>
      <SubMenu
        name="Назначение ролей"
        buttons={[
          {
            name: 'Массовый выбор',
            onClick: toggleBulkSelect,
            buttonStyle: 'secondary',
          },
        ]}
      />
      <div>
        <Form layout="vertical">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} lg={8}>
              <FormItem label="Роли">
                <Select
                  mode="multiple"
                  placeholder="Выберите роли"
                  options={roleOptions.map(role => ({
                    value: role.id,
                    label: role.name,
                  }))}
                  loading={loadingRoles}
                  value={selectedRoles}
                  onChange={value => setSelectedRoles(value as number[])}
                />
              </FormItem>
            </Col>
            <Col xs={24} md={12} lg={8}>
              <FormItem label="Действие">
                <Select
                  value={action}
                  onChange={value => setAction(value as RoleAssignmentAction)}
                  options={[
                    { label: 'Добавить роли', value: 'add' },
                    { label: 'Заменить роли', value: 'replace' },
                    { label: 'Удалить роли', value: 'remove' },
                  ]}
                />
              </FormItem>
            </Col>
            <Col xs={24} md={12} lg={6}>
              <FormItem label="Пользователи по фильтрам">
                <Typography.Text>Использовать текущие фильтры</Typography.Text>
              </FormItem>
            </Col>
            <Col xs={24} md={12} lg={2}>
              <FormItem>
                <Button
                  buttonStyle="primary"
                  onClick={handleAssignFiltered}
                  disabled={isActionDisabled}
                >
                  Применить
                </Button>
              </FormItem>
            </Col>
          </Row>
        </Form>
        <ListView<UserOption>
          columns={columns}
          count={usersCount}
          data={users}
          fetchData={fetchData}
          filters={filters}
          initialSort={[{ id: 'username', desc: false }]}
          loading={loading}
          pageSize={PAGE_SIZE}
          bulkActions={bulkActions}
          bulkSelectEnabled={bulkSelectEnabled}
          disableBulkSelect={toggleBulkSelect}
          addDangerToast={addDangerToast}
          addSuccessToast={addSuccessToast}
          refreshData={refreshData}
          renderBulkSelectCopy={selected =>
            `Выбрано пользователей: ${selected.length}`
          }
          onFiltersChange={setCurrentFilters}
        />
      </div>
    </>
  );
}

export default RoleAssignment;
