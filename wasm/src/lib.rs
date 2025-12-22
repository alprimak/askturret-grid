use wasm_bindgen::prelude::*;
use js_sys::{Array, Float64Array, Uint32Array};
use std::collections::HashMap;

// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Result type for returning indices
#[wasm_bindgen]
pub struct IndexResult {
    indices: Vec<u32>,
}

#[wasm_bindgen]
impl IndexResult {
    #[wasm_bindgen(getter)]
    pub fn indices(&self) -> Uint32Array {
        let arr = Uint32Array::new_with_length(self.indices.len() as u32);
        for (i, &idx) in self.indices.iter().enumerate() {
            arr.set_index(i as u32, idx);
        }
        arr
    }

    #[wasm_bindgen(getter)]
    pub fn len(&self) -> usize {
        self.indices.len()
    }
}

/// Sort direction enum
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum SortDirection {
    Asc = 0,
    Desc = 1,
}

/// Filter mode enum
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum FilterMode {
    Contains = 0,
    Equals = 1,
    StartsWith = 2,
    EndsWith = 3,
}

/// Sort numeric values and return sorted indices
#[wasm_bindgen]
pub fn sort_numbers(values: &Float64Array, direction: SortDirection) -> IndexResult {
    let len = values.length() as usize;
    let mut indices: Vec<u32> = (0..len as u32).collect();

    // Copy values to Vec for sorting
    let vals: Vec<f64> = values.to_vec();

    indices.sort_by(|&a, &b| {
        let va = vals[a as usize];
        let vb = vals[b as usize];

        // Handle NaN - sort to end
        if va.is_nan() && vb.is_nan() {
            return std::cmp::Ordering::Equal;
        }
        if va.is_nan() {
            return std::cmp::Ordering::Greater;
        }
        if vb.is_nan() {
            return std::cmp::Ordering::Less;
        }

        let cmp = va.partial_cmp(&vb).unwrap_or(std::cmp::Ordering::Equal);
        match direction {
            SortDirection::Desc => cmp.reverse(),
            SortDirection::Asc => cmp,
        }
    });

    IndexResult { indices }
}

/// Sort string values and return sorted indices
#[wasm_bindgen]
pub fn sort_strings(values: &Array, direction: SortDirection) -> IndexResult {
    let len = values.length() as usize;
    let mut indices: Vec<u32> = (0..len as u32).collect();

    // Convert to Vec<String>
    let vals: Vec<String> = (0..len)
        .map(|i| {
            values.get(i as u32)
                .as_string()
                .unwrap_or_default()
        })
        .collect();

    indices.sort_by(|&a, &b| {
        let va = &vals[a as usize];
        let vb = &vals[b as usize];

        let cmp = va.cmp(vb);
        match direction {
            SortDirection::Desc => cmp.reverse(),
            SortDirection::Asc => cmp,
        }
    });

    IndexResult { indices }
}

/// Filter strings by search term
#[wasm_bindgen]
pub fn filter_strings(values: &Array, search: &str, mode: FilterMode) -> IndexResult {
    let len = values.length() as usize;
    let search_lower = search.to_lowercase();

    let indices: Vec<u32> = (0..len)
        .filter_map(|i| {
            let val = values.get(i as u32)
                .as_string()
                .unwrap_or_default()
                .to_lowercase();

            let matches = match mode {
                FilterMode::Contains => val.contains(&search_lower),
                FilterMode::Equals => val == search_lower,
                FilterMode::StartsWith => val.starts_with(&search_lower),
                FilterMode::EndsWith => val.ends_with(&search_lower),
            };

            if matches { Some(i as u32) } else { None }
        })
        .collect();

    IndexResult { indices }
}

/// Filter numbers by range
#[wasm_bindgen]
pub fn filter_range(values: &Float64Array, min: f64, max: f64) -> IndexResult {
    let indices: Vec<u32> = values.to_vec()
        .iter()
        .enumerate()
        .filter_map(|(i, &v)| {
            if v >= min && v <= max {
                Some(i as u32)
            } else {
                None
            }
        })
        .collect();

    IndexResult { indices }
}

// ============================================================================
// Trigram Index for fast text search
// ============================================================================

/// Generate trigrams from a string
fn generate_trigrams(s: &str) -> Vec<String> {
    let s = s.to_lowercase();
    let chars: Vec<char> = s.chars().collect();

    if chars.len() < 3 {
        return vec![s];
    }

    (0..chars.len() - 2)
        .map(|i| chars[i..i + 3].iter().collect())
        .collect()
}

/// Trigram index for fast text search
#[wasm_bindgen]
pub struct TrigramIndex {
    // Maps trigram -> list of row indices that contain it
    index: HashMap<String, Vec<u32>>,
    // Original values for fallback
    values: Vec<String>,
}

#[wasm_bindgen]
impl TrigramIndex {
    /// Create a new trigram index from an array of strings
    #[wasm_bindgen(constructor)]
    pub fn new(values: &Array) -> TrigramIndex {
        let len = values.length() as usize;
        let mut index: HashMap<String, Vec<u32>> = HashMap::new();
        let mut vals: Vec<String> = Vec::with_capacity(len);

        for i in 0..len {
            let val = values.get(i as u32)
                .as_string()
                .unwrap_or_default();

            // Add to trigram index
            for trigram in generate_trigrams(&val) {
                index.entry(trigram)
                    .or_insert_with(Vec::new)
                    .push(i as u32);
            }

            vals.push(val.to_lowercase());
        }

        TrigramIndex { index, values: vals }
    }

    /// Search using the trigram index
    pub fn search(&self, query: &str) -> IndexResult {
        let query_lower = query.to_lowercase();
        let query_trigrams = generate_trigrams(&query_lower);

        if query_trigrams.is_empty() {
            // Short query - fall back to linear scan
            let indices: Vec<u32> = self.values
                .iter()
                .enumerate()
                .filter_map(|(i, v)| {
                    if v.contains(&query_lower) {
                        Some(i as u32)
                    } else {
                        None
                    }
                })
                .collect();
            return IndexResult { indices };
        }

        // Find candidates using trigram intersection
        let mut candidates: Option<Vec<u32>> = None;

        for trigram in &query_trigrams {
            if let Some(matches) = self.index.get(trigram) {
                candidates = Some(match candidates {
                    None => matches.clone(),
                    Some(existing) => {
                        // Intersect with existing candidates
                        existing.into_iter()
                            .filter(|idx| matches.contains(idx))
                            .collect()
                    }
                });
            } else {
                // Trigram not found - no matches
                return IndexResult { indices: vec![] };
            }
        }

        // Verify candidates actually contain the full query
        let indices: Vec<u32> = candidates
            .unwrap_or_default()
            .into_iter()
            .filter(|&idx| {
                self.values.get(idx as usize)
                    .map(|v| v.contains(&query_lower))
                    .unwrap_or(false)
            })
            .collect();

        IndexResult { indices }
    }

    /// Get the number of indexed values
    pub fn len(&self) -> usize {
        self.values.len()
    }

    /// Check if index is empty
    pub fn is_empty(&self) -> bool {
        self.values.is_empty()
    }
}

// ============================================================================
// GridState - Persistent state for grid operations (used by GridCore.ts)
// ============================================================================

/// Sort direction enum for GridState (includes None)
#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq)]
pub enum SortDir {
    Asc = 0,
    Desc = 1,
    None = 2,
}

/// GridState - Keeps grid data in WASM memory for efficient filtering/sorting
#[wasm_bindgen]
pub struct GridState {
    columns: Vec<Vec<String>>,
    sort_col: i32,
    sort_dir: SortDir,
    filter: String,
    view_cache: Option<Vec<u32>>,
}

#[wasm_bindgen]
impl GridState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GridState {
        GridState {
            columns: Vec::new(),
            sort_col: -1,
            sort_dir: SortDir::None,
            filter: String::new(),
            view_cache: None,
        }
    }

    pub fn set_data(&mut self, columns: &Array) {
        let col_count = columns.length() as usize;
        self.columns = Vec::with_capacity(col_count);

        for c in 0..col_count {
            let col_arr = Array::from(&columns.get(c as u32));
            let row_count = col_arr.length() as usize;
            let mut col_data = Vec::with_capacity(row_count);

            for r in 0..row_count {
                col_data.push(col_arr.get(r as u32).as_string().unwrap_or_default());
            }
            self.columns.push(col_data);
        }
        self.view_cache = None;
    }

    pub fn set_sort(&mut self, col: i32, direction: SortDir) {
        self.sort_col = col;
        self.sort_dir = direction;
        self.view_cache = None;
    }

    pub fn set_filter(&mut self, search: &str) {
        self.filter = search.to_lowercase();
        self.view_cache = None;
    }

    pub fn get_view(&mut self) -> Uint32Array {
        if self.view_cache.is_none() {
            self.compute_view();
        }
        let indices = self.view_cache.as_ref().unwrap();
        let arr = Uint32Array::new_with_length(indices.len() as u32);
        for (i, &idx) in indices.iter().enumerate() {
            arr.set_index(i as u32, idx);
        }
        arr
    }

    pub fn get_view_count(&mut self) -> usize {
        if self.view_cache.is_none() {
            self.compute_view();
        }
        self.view_cache.as_ref().map(|v| v.len()).unwrap_or(0)
    }

    pub fn row_count(&self) -> usize {
        self.columns.first().map(|c| c.len()).unwrap_or(0)
    }

    pub fn col_count(&self) -> usize {
        self.columns.len()
    }

    fn compute_view(&mut self) {
        let row_count = self.row_count();
        let mut indices: Vec<u32> = (0..row_count as u32).collect();

        // Filter
        if !self.filter.is_empty() {
            indices.retain(|&row| {
                self.columns.iter().any(|col| {
                    col.get(row as usize)
                        .map(|v| v.to_lowercase().contains(&self.filter))
                        .unwrap_or(false)
                })
            });
        }

        // Sort
        if self.sort_col >= 0 && self.sort_dir != SortDir::None {
            if let Some(col) = self.columns.get(self.sort_col as usize) {
                let dir = self.sort_dir;
                indices.sort_by(|&a, &b| {
                    let va = col.get(a as usize).map(|s| s.as_str()).unwrap_or("");
                    let vb = col.get(b as usize).map(|s| s.as_str()).unwrap_or("");

                    // Try numeric comparison first
                    let cmp = match (va.parse::<f64>(), vb.parse::<f64>()) {
                        (Ok(na), Ok(nb)) => na.partial_cmp(&nb).unwrap_or(std::cmp::Ordering::Equal),
                        _ => va.cmp(vb),
                    };

                    match dir {
                        SortDir::Desc => cmp.reverse(),
                        _ => cmp,
                    }
                });
            }
        }

        self.view_cache = Some(indices);
    }
}

/// IndexedGridState - GridState with trigram indexing for fast filtering
#[wasm_bindgen]
pub struct IndexedGridState {
    columns: Vec<Vec<String>>,
    trigram_index: HashMap<String, Vec<u32>>,
    sort_col: i32,
    sort_dir: SortDir,
    filter: String,
    view_cache: Option<Vec<u32>>,
}

#[wasm_bindgen]
impl IndexedGridState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> IndexedGridState {
        IndexedGridState {
            columns: Vec::new(),
            trigram_index: HashMap::new(),
            sort_col: -1,
            sort_dir: SortDir::None,
            filter: String::new(),
            view_cache: None,
        }
    }

    pub fn set_data(&mut self, columns: &Array) {
        let col_count = columns.length() as usize;
        self.columns = Vec::with_capacity(col_count);
        self.trigram_index.clear();

        for c in 0..col_count {
            let col_arr = Array::from(&columns.get(c as u32));
            let row_count = col_arr.length() as usize;
            let mut col_data = Vec::with_capacity(row_count);

            for r in 0..row_count {
                let val = col_arr.get(r as u32).as_string().unwrap_or_default();

                // Build trigram index
                for trigram in generate_trigrams(&val) {
                    self.trigram_index.entry(trigram)
                        .or_insert_with(Vec::new)
                        .push(r as u32);
                }

                col_data.push(val);
            }
            self.columns.push(col_data);
        }
        self.view_cache = None;
    }

    pub fn set_sort(&mut self, col: i32, direction: SortDir) {
        self.sort_col = col;
        self.sort_dir = direction;
        self.view_cache = None;
    }

    pub fn set_filter(&mut self, search: &str) {
        self.filter = search.to_lowercase();
        self.view_cache = None;
    }

    pub fn get_view(&mut self) -> Uint32Array {
        if self.view_cache.is_none() {
            self.compute_view();
        }
        let indices = self.view_cache.as_ref().unwrap();
        let arr = Uint32Array::new_with_length(indices.len() as u32);
        for (i, &idx) in indices.iter().enumerate() {
            arr.set_index(i as u32, idx);
        }
        arr
    }

    pub fn get_view_count(&mut self) -> usize {
        if self.view_cache.is_none() {
            self.compute_view();
        }
        self.view_cache.as_ref().map(|v| v.len()).unwrap_or(0)
    }

    pub fn row_count(&self) -> usize {
        self.columns.first().map(|c| c.len()).unwrap_or(0)
    }

    pub fn col_count(&self) -> usize {
        self.columns.len()
    }

    fn compute_view(&mut self) {
        let row_count = self.row_count();

        // Filter using trigram index
        let mut indices: Vec<u32> = if self.filter.is_empty() {
            (0..row_count as u32).collect()
        } else {
            let query_trigrams = generate_trigrams(&self.filter);

            if query_trigrams.is_empty() || query_trigrams[0] == self.filter {
                // Short query - linear scan
                (0..row_count as u32)
                    .filter(|&row| {
                        self.columns.iter().any(|col| {
                            col.get(row as usize)
                                .map(|v| v.to_lowercase().contains(&self.filter))
                                .unwrap_or(false)
                        })
                    })
                    .collect()
            } else {
                // Use trigram index for candidate selection
                let mut candidates: Option<Vec<u32>> = None;

                for trigram in &query_trigrams {
                    if let Some(matches) = self.trigram_index.get(trigram) {
                        candidates = Some(match candidates {
                            None => matches.clone(),
                            Some(existing) => {
                                existing.into_iter()
                                    .filter(|idx| matches.contains(idx))
                                    .collect()
                            }
                        });
                    } else {
                        candidates = Some(vec![]);
                        break;
                    }
                }

                // Verify candidates
                candidates.unwrap_or_default()
                    .into_iter()
                    .filter(|&row| {
                        self.columns.iter().any(|col| {
                            col.get(row as usize)
                                .map(|v| v.to_lowercase().contains(&self.filter))
                                .unwrap_or(false)
                        })
                    })
                    .collect()
            }
        };

        // Sort
        if self.sort_col >= 0 && self.sort_dir != SortDir::None {
            if let Some(col) = self.columns.get(self.sort_col as usize) {
                let dir = self.sort_dir;
                indices.sort_by(|&a, &b| {
                    let va = col.get(a as usize).map(|s| s.as_str()).unwrap_or("");
                    let vb = col.get(b as usize).map(|s| s.as_str()).unwrap_or("");

                    let cmp = match (va.parse::<f64>(), vb.parse::<f64>()) {
                        (Ok(na), Ok(nb)) => na.partial_cmp(&nb).unwrap_or(std::cmp::Ordering::Equal),
                        _ => va.cmp(vb),
                    };

                    match dir {
                        SortDir::Desc => cmp.reverse(),
                        _ => cmp,
                    }
                });
            }
        }

        self.view_cache = Some(indices);
    }
}

// ============================================================================
// Benchmarking functions
// ============================================================================

#[wasm_bindgen]
pub fn bench_grid_state(count: u32) -> f64 {
    use js_sys::Date;

    let columns = Array::new_with_length(2);
    let col0 = Array::new_with_length(count);
    let col1 = Array::new_with_length(count);

    for i in 0..count {
        col0.set(i, JsValue::from_str(&format!("name_{}", i % 1000)));
        col1.set(i, JsValue::from_str(&format!("{}", i % 10000)));
    }
    columns.set(0, col0.into());
    columns.set(1, col1.into());

    let start = Date::now();
    let mut state = GridState::new();
    state.set_data(&columns);
    state.set_filter("name_42");
    state.set_sort(1, SortDir::Desc);
    let _view = state.get_view();
    Date::now() - start
}

#[wasm_bindgen]
pub fn bench_filter_only(count: u32) -> f64 {
    use js_sys::Date;

    let columns = Array::new_with_length(1);
    let col0 = Array::new_with_length(count);
    for i in 0..count {
        col0.set(i, JsValue::from_str(&format!("item_{}", i % 1000)));
    }
    columns.set(0, col0.into());

    let mut state = GridState::new();
    state.set_data(&columns);

    let start = Date::now();
    state.set_filter("item_42");
    let _view = state.get_view();
    Date::now() - start
}

#[wasm_bindgen]
pub fn bench_sort_only(count: u32) -> f64 {
    use js_sys::Date;

    let columns = Array::new_with_length(1);
    let col0 = Array::new_with_length(count);
    for i in 0..count {
        col0.set(i, JsValue::from_str(&format!("{}", (i * 7) % 10000)));
    }
    columns.set(0, col0.into());

    let mut state = GridState::new();
    state.set_data(&columns);

    let start = Date::now();
    state.set_sort(0, SortDir::Asc);
    let _view = state.get_view();
    Date::now() - start
}

#[wasm_bindgen]
pub fn bench_indexed_filter_with_build(count: u32) -> f64 {
    use js_sys::Date;

    let columns = Array::new_with_length(1);
    let col0 = Array::new_with_length(count);
    for i in 0..count {
        col0.set(i, JsValue::from_str(&format!("company_{}_stock", i % 1000)));
    }
    columns.set(0, col0.into());

    let start = Date::now();
    let mut state = IndexedGridState::new();
    state.set_data(&columns);
    state.set_filter("company_42");
    let _view = state.get_view();
    Date::now() - start
}

#[wasm_bindgen]
pub fn bench_indexed_filter_only(count: u32) -> f64 {
    use js_sys::Date;

    let columns = Array::new_with_length(1);
    let col0 = Array::new_with_length(count);
    for i in 0..count {
        col0.set(i, JsValue::from_str(&format!("company_{}_stock", i % 1000)));
    }
    columns.set(0, col0.into());

    let mut state = IndexedGridState::new();
    state.set_data(&columns);

    let start = Date::now();
    state.set_filter("company_42");
    let _view = state.get_view();
    Date::now() - start
}

#[wasm_bindgen]
pub fn bench_scan_filter(count: u32) -> f64 {
    use js_sys::Date;

    let columns = Array::new_with_length(1);
    let col0 = Array::new_with_length(count);
    for i in 0..count {
        col0.set(i, JsValue::from_str(&format!("company_{}_stock", i % 1000)));
    }
    columns.set(0, col0.into());

    let mut state = GridState::new();
    state.set_data(&columns);

    let start = Date::now();
    state.set_filter("company_42");
    let _view = state.get_view();
    Date::now() - start
}

#[wasm_bindgen]
pub fn bench_repeated_filter(count: u32, iterations: u32) -> f64 {
    use js_sys::Date;

    let columns = Array::new_with_length(1);
    let col0 = Array::new_with_length(count);
    for i in 0..count {
        col0.set(i, JsValue::from_str(&format!("company_{}_stock", i % 1000)));
    }
    columns.set(0, col0.into());

    let mut state = IndexedGridState::new();
    state.set_data(&columns);

    let start = Date::now();
    for i in 0..iterations {
        state.set_filter(&format!("company_{}", i % 100));
        let _view = state.get_view();
    }
    Date::now() - start
}

#[wasm_bindgen]
pub fn bench_sort(count: u32) -> f64 {
    use js_sys::Date;

    // Generate random data
    let values: Vec<f64> = (0..count)
        .map(|i| (i as f64 * 1.5) % 1000.0)
        .collect();

    let arr = Float64Array::new_with_length(count);
    for (i, &v) in values.iter().enumerate() {
        arr.set_index(i as u32, v);
    }

    let start = Date::now();
    let _result = sort_numbers(&arr, SortDirection::Asc);
    Date::now() - start
}

#[wasm_bindgen]
pub fn bench_filter(count: u32) -> f64 {
    use js_sys::Date;

    // Generate test strings
    let values = Array::new_with_length(count);
    for i in 0..count {
        values.set(i, JsValue::from_str(&format!("item_{}", i % 1000)));
    }

    let start = Date::now();
    let _result = filter_strings(&values, "item_42", FilterMode::Contains);
    Date::now() - start
}

#[wasm_bindgen]
pub fn bench_trigram(count: u32) -> f64 {
    use js_sys::Date;

    // Generate test strings
    let values = Array::new_with_length(count);
    for i in 0..count {
        values.set(i, JsValue::from_str(&format!("company_{}_stock", i % 1000)));
    }

    let index = TrigramIndex::new(&values);

    let start = Date::now();
    let _result = index.search("company_42");
    Date::now() - start
}
