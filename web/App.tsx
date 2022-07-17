import { css } from '@linaria/core';
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import DataGrid, { Column, HeaderRendererProps } from 'react-data-grid';

import { getBenchmarks } from './utils';

interface Row {
  averageDuration?: number;
  architecture: string;
  runtime: string;
  codeSize: number;
  iterations: number;
  minify: boolean;
  name: string;
  coldStartPercent: number;
  date: string;
  averageColdStart: number;
  sourceType: string;
  xray: boolean;
  memorySize: number;
  p90Duration: number;
  sdk: string;
  p90ColdStartPercent: number;
  format: string;
}

interface Filter extends Row {
  enabled: boolean;
}

const FilterContext = createContext<Filter | undefined>(undefined);

function inputStopPropagation(event: React.KeyboardEvent<HTMLInputElement>) {
  if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.stopPropagation();
  }
}

function selectStopPropagation(event: React.KeyboardEvent<HTMLSelectElement>) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.stopPropagation();
  }
}

const rootClassname = css`
  display: flex;
  flex-direction: column;
  block-size: 100%;
  gap: 10px;
  > .rdg {
    flex: 1;
  }
`;

const toolbarClassname = css`
  text-align: end;
`;

const filterColumnClassName = 'filter-cell';

const filterContainerClassname = css`
  .${filterColumnClassName} {
    line-height: 35px;
    padding: 0;
    > div {
      padding-block: 0;
      padding-inline: 8px;
      &:first-child {
        border-block-end: 1px solid var(--rdg-border-color);
      }
    }
  }
`;

const filterClassname = css`
  inline-size: 100%;
  padding: 4px;
  font-size: 14px;
`;

const defaultFilters = {
  averageDuration: undefined,
  architecture: '',
  runtime: '',
  codeSize: 0,
  iterations: 0,
  minify: true,
  name: '',
  coldStartPercent: 0,
  date: '',
  averageColdStart: 0,
  sourceType: '',
  xray: true,
  memorySize: 0,
  p90Duration: 0,
  sdk: '',
  p90ColdStartPercent: 0,
  format: '',
  enabled: true,
};

// Copied from https://github.com/adazzle/react-data-grid/blob/main/src/hooks/useFocusRef.ts
// For some reason this function isn't exported.
// https://github.com/adazzle/react-data-grid/issues/2834
const useFocusRef = <T extends HTMLOrSVGElement>(isSelected: boolean) => {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    if (!isSelected) return;
    ref.current?.focus({ preventScroll: true });
  }, [isSelected]);

  return {
    ref,
    tabIndex: isSelected ? 0 : -1,
  };
};

const FilterRenderer = <R, SR, T extends HTMLOrSVGElement>({
  isCellSelected,
  column,
  children,
}: HeaderRendererProps<R, SR> & {
  children: (args: {
    ref: React.RefObject<T>;
    tabIndex: number;
    filters: Filter;
  }) => React.ReactElement;
}) => {
  const filters = useContext(FilterContext)!;
  const { ref, tabIndex } = useFocusRef<T>(isCellSelected);
  console.log(filters);
  return (
    <>
      <div>{column.name}</div>
      {filters.enabled && <div>{children({ ref, tabIndex, filters })}</div>}
    </>
  );
};

const App = () => {
  const [filters, setFilters] = useState<Filter>({ ...defaultFilters });

  const [rows, setRows] = useState([]);

  const columns = useMemo((): readonly Column<Row>[] => {
    return [
      {
        key: 'name',
        name: 'Name',
        headerCellClass: filterColumnClassName,
        headerRenderer: (p) => (
          <FilterRenderer<Row, unknown, HTMLInputElement> {...p}>
            {({ filters, ...rest }) => (
              <input
                {...rest}
                className={filterClassname}
                value={filters.name}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    name: e.target.value,
                  })
                }
                onKeyDown={inputStopPropagation}
              />
            )}
          </FilterRenderer>
        ),
      },
      {
        key: 'averageDuration',
        name: 'Avg Duration',
        headerCellClass: filterColumnClassName,
        headerRenderer: (p) => (
          <FilterRenderer<Row, unknown, HTMLInputElement> {...p}>
            {({ filters, ...rest }) => (
              <input
                {...rest}
                className={filterClassname}
                value={filters.averageDuration}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    averageDuration: Number(e.target.value),
                  })
                }
                onKeyDown={inputStopPropagation}
              />
            )}
          </FilterRenderer>
        ),
      },
      {
        key: 'priority',
        name: 'Priority',
        headerCellClass: filterColumnClassName,
        headerRenderer: (p) => (
          <FilterRenderer<Row, unknown, HTMLSelectElement> {...p}>
            {({ filters, ...rest }) => (
              <select
                {...rest}
                className={filterClassname}
                value={filters.architecture}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    architecture: e.target.value,
                  })
                }
                onKeyDown={selectStopPropagation}
              >
                <option value="All">All</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            )}
          </FilterRenderer>
        ),
      },
      //   {
      //     key: 'id',
      //     name: 'ID',
      //     width: 50,
      //   },
      //   {
      //     key: 'task',
      //     name: 'Title',
      //     headerCellClass: filterColumnClassName,
      //     headerRenderer: (p) => (
      //       <FilterRenderer<Row, unknown, HTMLInputElement> {...p}>
      //         {({ filters, ...rest }) => (
      //           <input
      //             {...rest}
      //             className={filterClassname}
      //             value={filters.task}
      //             onChange={(e) =>
      //               setFilters({
      //                 ...filters,
      //                 task: e.target.value,
      //               })
      //             }
      //             onKeyDown={inputStopPropagation}
      //           />
      //         )}
      //       </FilterRenderer>
      //     ),
      //   },
      //   {
      //     key: 'priority',
      //     name: 'Priority',
      //     headerCellClass: filterColumnClassName,
      //     headerRenderer: (p) => (
      //       <FilterRenderer<Row, unknown, HTMLSelectElement> {...p}>
      //         {({ filters, ...rest }) => (
      //           <select
      //             {...rest}
      //             className={filterClassname}
      //             value={filters.priority}
      //             onChange={(e) =>
      //               setFilters({
      //                 ...filters,
      //                 priority: e.target.value,
      //               })
      //             }
      //             onKeyDown={selectStopPropagation}
      //           >
      //             <option value="All">All</option>
      //             <option value="Critical">Critical</option>
      //             <option value="High">High</option>
      //             <option value="Medium">Medium</option>
      //             <option value="Low">Low</option>
      //           </select>
      //         )}
      //       </FilterRenderer>
      //     ),
      //   },
      //   {
      //     key: 'issueType',
      //     name: 'Issue Type',
      //     headerCellClass: filterColumnClassName,
      //     headerRenderer: (p) => (
      //       <FilterRenderer<Row, unknown, HTMLSelectElement> {...p}>
      //         {({ filters, ...rest }) => (
      //           <select
      //             {...rest}
      //             className={filterClassname}
      //             value={filters.issueType}
      //             onChange={(e) =>
      //               setFilters({
      //                 ...filters,
      //                 issueType: e.target.value,
      //               })
      //             }
      //             onKeyDown={selectStopPropagation}
      //           >
      //             <option value="All">All</option>
      //             <option value="Bug">Bug</option>
      //             <option value="Improvement">Improvement</option>
      //             <option value="Epic">Epic</option>
      //             <option value="Story">Story</option>
      //           </select>
      //         )}
      //       </FilterRenderer>
      //     ),
      //   },
      //   {
      //     key: 'developer',
      //     name: 'Developer',
      //     headerCellClass: filterColumnClassName,
      //     headerRenderer: (p) => (
      //       <FilterRenderer<Row, unknown, HTMLInputElement> {...p}>
      //         {({ filters, ...rest }) => (
      //           <input
      //             {...rest}
      //             className={filterClassname}
      //             value={filters.developer}
      //             onChange={(e) =>
      //               setFilters({
      //                 ...filters,
      //                 developer: e.target.value,
      //               })
      //             }
      //             onKeyDown={inputStopPropagation}
      //             list="developers"
      //           />
      //         )}
      //       </FilterRenderer>
      //     ),
      //   },
      //   {
      //     key: 'complete',
      //     name: '% Complete',
      //     headerCellClass: filterColumnClassName,
      //     headerRenderer: (p) => (
      //       <FilterRenderer<Row, unknown, HTMLInputElement> {...p}>
      //         {({ filters, ...rest }) => (
      //           <input
      //             {...rest}
      //             type="number"
      //             className={filterClassname}
      //             value={filters.complete}
      //             onChange={(e) =>
      //               setFilters({
      //                 ...filters,
      //                 complete: Number.isFinite(e.target.valueAsNumber)
      //                   ? e.target.valueAsNumber
      //                   : undefined,
      //               })
      //             }
      //             onKeyDown={inputStopPropagation}
      //           />
      //         )}
      //       </FilterRenderer>
      //     ),
      //   },
    ];
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((r: Row) => {
      return (
        (filters.name
          ? r.name.toLowerCase().includes(filters.name.toLowerCase())
          : true) &&
        (filters.averageDuration
          ? (r.averageDuration || 0) <= filters.averageDuration
          : true)
      );
      // (filters.priority !== 'All' ? r.priority === filters.priority : true) &&
      // (filters.issueType !== 'All'
      //   ? r.issueType === filters.issueType
      //   : true) &&
      // (filters.developer
      //   ? r.developer
      //       .toLowerCase()
      //       .startsWith(filters.developer.toLowerCase())
      //   : true) &&
      // (filters.complete !== undefined ? r.complete >= filters.complete : true)
    });
  }, [rows, filters]);

  useEffect(() => {
    getBenchmarks().then((b) => {
      //   setColumns(Object.keys(b.Items[0]).map((k) => ({ key: k, name: k })));
      setRows(b.Items);
    });
  }, []);

  const clearFilters = () =>
    setFilters({
      ...defaultFilters,
    });

  const toggleFilters = () =>
    setFilters((filters) => ({
      ...filters,
      enabled: !filters.enabled,
    }));

  return (
    <div className={rootClassname}>
      <div className={toolbarClassname}>
        <button type="button" onClick={toggleFilters}>
          Toggle Filters
        </button>{' '}
        <button type="button" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>
      <FilterContext.Provider value={filters}>
        <DataGrid
          className={filters.enabled ? filterContainerClassname : undefined}
          columns={columns}
          headerRowHeight={filters.enabled ? 70 : undefined}
          rows={filteredRows}
        />
      </FilterContext.Provider>
    </div>
  );
};

export default App;
