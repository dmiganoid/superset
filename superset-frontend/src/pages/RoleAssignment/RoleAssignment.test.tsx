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
import fetchMock from 'fetch-mock';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { render, screen, waitFor, act } from 'spec/helpers/testing-library';
import { MemoryRouter } from 'react-router-dom';
import { QueryParamProvider } from 'use-query-params';
import RoleAssignment from './index';

const mockStore = configureStore([thunk]);
const store = mockStore({});

const usersEndpoint = 'glob:*/api/v1/security/users/?*';
const usersInfoEndpoint = 'glob:*/api/v1/security/users/_info*';
const rolesEndpoint = 'glob:*/api/v1/security/roles/?*';

const mockUsers = new Array(3).fill(undefined).map((_, i) => ({
  active: true,
  changed_by: { id: 1 },
  changed_on: new Date(2025, 2, 25, 11, 4, 32 + i).toISOString(),
  created_by: { id: 1 },
  created_on: new Date(2025, 2, 25, 11, 4, 32 + i).toISOString(),
  email: `user${i}@example.com`,
  fail_login_count: null,
  first_name: `User${i}`,
  id: i + 1,
  last_login: null,
  last_name: `Test${i}`,
  login_count: null,
  roles: [{ id: i + 1, name: `role ${i + 1}` }],
  username: `user${i}`,
  groups: [],
}));

const mockRoles = new Array(3).fill(undefined).map((_, i) => ({
  id: i + 1,
  name: `role ${i + 1}`,
}));

fetchMock.get(usersEndpoint, {
  ids: [1, 2, 3],
  result: mockUsers,
  count: 3,
});

fetchMock.get(usersInfoEndpoint, {
  permissions: [],
});

fetchMock.get(rolesEndpoint, {
  ids: [1, 2, 3],
  result: mockRoles,
  count: 3,
});

beforeEach(() => {
  fetchMock.resetHistory();
});

const renderRoleAssignment = async () => {
  await act(async () => {
    render(
      <MemoryRouter>
        <QueryParamProvider>
          <RoleAssignment />
        </QueryParamProvider>
      </MemoryRouter>,
      { useRedux: true, store },
    );
  });
};

test('renders role assignment page', async () => {
  await renderRoleAssignment();
  expect(await screen.findByText('Назначение ролей')).toBeInTheDocument();
});

test('fetches users and roles on load', async () => {
  await renderRoleAssignment();
  await waitFor(() => {
    expect(fetchMock.calls(usersEndpoint).length).toBeGreaterThan(0);
    expect(fetchMock.calls(rolesEndpoint).length).toBeGreaterThan(0);
  });
});
