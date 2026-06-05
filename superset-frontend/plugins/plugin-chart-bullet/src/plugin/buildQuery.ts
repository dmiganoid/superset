/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0.
 */
import { buildQueryContext } from '@superset-ui/core';

import type {
  QueryFormColumn,
  QueryFormMetric,
  SqlaFormData,
} from '@superset-ui/core';

import { BulletChartFormData } from '../types';

function normalizeRowLimit(rowLimit: unknown): number | undefined {
  if (rowLimit === null || rowLimit === undefined || rowLimit === '') {
    return undefined;
  }

  const parsed = Number(rowLimit);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function isQueryFormColumn(column: unknown): column is QueryFormColumn {
  if (typeof column === 'string') {
    return column.length > 0;
  }

  return typeof column === 'object' && column !== null;
}

function normalizeGroupby(groupby: unknown): QueryFormColumn[] {
  if (!groupby) {
    return [];
  }

  if (Array.isArray(groupby)) {
    return groupby.filter(isQueryFormColumn);
  }

  return isQueryFormColumn(groupby) ? [groupby] : [];
}

function isMetric(
  metric: QueryFormMetric | null | undefined,
): metric is QueryFormMetric {
  return metric !== null && metric !== undefined;
}

export default function buildQuery(formData: SqlaFormData) {
  const bulletFormData = formData as BulletChartFormData;

  const groupby = normalizeGroupby(bulletFormData.groupby);
  const metrics = [
    bulletFormData.actualMetric,
    bulletFormData.targetMetric,
  ].filter(isMetric);

  return buildQueryContext(bulletFormData, {
    buildQuery: baseQueryObject => [
      {
        ...baseQueryObject,
        columns: groupby,
        metrics,
        row_limit: normalizeRowLimit(bulletFormData.row_limit) ?? 1000,
      },
    ],
  });
}