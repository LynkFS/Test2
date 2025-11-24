# Document-First Code Generation System

## What This Is

This is a **true document-first development methodology** implemented as a working code generation system. Unlike traditional approaches that start with data models, this system starts with a **document schema** that describes what the system needs to produce, and generates all code from that single source of truth.

## The Fundamental Difference

### Traditional Approach (What We Built Before)
```
Developer writes code → Code produces document
```

1. Create database tables manually
2. Write PHP entity classes manually
3. Build API endpoints manually
4. Create UI components manually
5. Hope everything works together to produce the document

**Problem**: Each piece is hand-coded, validated separately, and can drift out of sync.

### Document-First Approach (This System)
```
Document schema → Generated code → Document output
```

1. Define the document structure in YAML (the **only** manual step)
2. Run generator
3. Everything else is created automatically

**Advantage**: Single source of truth. Change the schema, regenerate, everything updates consistently.

## Directory Structure

```
document-first/
├── schemas/
│   └── capital_works_program.yaml    ← THE SINGLE SOURCE OF TRUTH
│
├── generator/
│   ├── SchemaParser.php               ← Reads YAML schema
│   ├── DatabaseGenerator.php          ← Generates SQL migrations
│   ├── EntityGenerator.php            ← Generates PHP models
│   └── ApiGenerator.php               ← Generates API endpoints
│
├── generated/
│   ├── database/
│   │   └── 003_capital_works_generated.sql
│   ├── models/
│   │   ├── Project.php
│   │   ├── Risk.php
│   │   └── Asset.php
│   └── api/
│       ├── executive_summary.php
│       ├── project_portfolio.php
│       ├── risk_register.php
│       └── get_document.php
│
└── generate.php                       ← Main generator orchestrator
```

## How It Works

### Step 1: Define the Document Schema

The schema (`schemas/capital_works_program.yaml`) describes:

**1. Document Metadata**
```yaml
document:
  name: "Capital Works Program"
  description: "Annual infrastructure investment program"
  workflow:
    states: [draft, under_review, approved, published]
```

**2. Document Sections** (This is the heart)
```yaml
sections:
  - id: executive_summary
    label: "Executive Summary"
    type: calculated           # ← This is calculated, not stored
    fields:
      - name: total_program_value
        type: currency
        calculation: "SUM(projects.estimated_cost)"  # ← Formula
      - name: funding_breakdown
        type: object_array
        calculation: "GROUP_BY(projects, funding_source)"
```

**3. Entities** (Discovered from sections)
```yaml
entities:
  - name: Project
    table: projects
    fields:
      - name: project_id
        type: string
        required: true
      - name: estimated_cost
        type: currency
        min: 0                 # ← Validation rule
```

**4. Validations** (Document-level rules)
```yaml
validations:
  - id: budget_constraint
    rule: "SUM(projects.estimated_cost) <= budget.capital_allocation"
    message: "Total program cost exceeds budget"
    severity: error
```

**5. API Endpoints** (One per section)
```yaml
api:
  endpoints:
    - path: "/{financial_year}/executive-summary"
      section: executive_summary
      cache_ttl: 1800
```

### Step 2: Run the Generator

From your Docker PHP container:

```bash
cd /path/to/capital-works-program/document-first
php generate.php
```

Or manually:
```bash
docker exec -it php-api-container bash
cd /var/www/document-first
php generate.php
```

Output:
```
====================================================================
DOCUMENT-FIRST CODE GENERATOR
====================================================================

Schema file: schemas/capital_works_program.yaml

[1/4] Parsing document schema...
  ✓ Loaded schema for: Capital Works Program
  ✓ Found 3 entities
  ✓ Found 3 sections

[2/4] Generating database migration...
  ✓ Generated: generated/database/003_capital_works_generated.sql

[3/4] Generating entity models...
  ✓ Generated: Project.php
  ✓ Generated: Risk.php
  ✓ Generated: Asset.php

[4/4] Generating API endpoints...
  ✓ Generated: executive_summary.php
  ✓ Generated: project_portfolio.php
  ✓ Generated: risk_register.php
  ✓ Generated: get_document.php

====================================================================
GENERATION COMPLETE
====================================================================
```

### Step 3: Deploy Generated Code

```bash
# 1. Run database migration
mysql -u app_user -p AMDP < generated/database/003_capital_works_generated.sql

# 2. Copy PHP models
cp generated/models/*.php /Users/nicowouterse/Docker/services/php-api/src/CapitalWorks/

# 3. Copy API endpoints
cp generated/api/*.php /Users/nicowouterse/Docker/services/php-api/public/api/capital-works-program/
```

### Step 4: Use the APIs

The generated APIs are section-centric:

```bash
# Get executive summary
curl https://lynkfs.com/api/capital-works-program/executive_summary.php?fy=2025/26

# Response (calculated from data):
{
  "total_program_value": 1660000.00,
  "project_count": 3,
  "approved_count": 3,
  "in_progress_count": 0,
  "funding_breakdown": [
    {
      "funding_source": "Grant/Rates",
      "amount": 890000.00,
      "project_count": 1,
      "percentage": 53.61
    },
    {
      "funding_source": "Rates",
      "amount": 770000.00,
      "project_count": 2,
      "percentage": 46.39
    }
  ],
  "category_breakdown": [...]
}
```

## What Gets Generated

### 1. Database Migration (`generated/database/003_capital_works_generated.sql`)

Creates:
- **Entity tables** with all fields, types, constraints from schema
- **Indexes** on fields marked as `indexed: true` or `searchable: true`
- **Check constraints** from `min`/`max` values
- **Views** for calculated sections
- **Functions** for complex calculations (risk scores, etc.)
- **Sample data** for testing

**Example**:
```sql
-- Generated from schema field definition:
--   name: estimated_cost
--   type: currency
--   required: true
--   min: 0

CREATE TABLE projects (
    ...
    estimated_cost DECIMAL(15,2) NOT NULL CHECK (estimated_cost >= 0),
    ...
);
```

### 2. Entity Models (`generated/models/*.php`)

Each entity becomes a PHP class with:
- **Type-hinted properties** from schema field types
- **Constructor** that accepts arrays
- **Validation method** with all rules from schema
- **Calculated properties** (duration_days, risk_score, etc.)
- **toArray()** method for JSON serialization

**Example**:
```php
// Generated from schema
class Project {
    public string $project_id;
    public string $name;
    public float $estimated_cost;
    // ... all other fields

    public function validate(): array {
        $errors = [];

        // Generated from: required: true
        if (empty($this->project_id)) {
            $errors[] = "project_id is required";
        }

        // Generated from: min: 0
        if ($this->estimated_cost < 0) {
            $errors[] = "estimated_cost must be at least 0";
        }

        return $errors;
    }
}
```

### 3. API Endpoints (`generated/api/*.php`)

Each document section becomes an API endpoint:

**Calculated Sections** (`executive_summary.php`):
- Executes SQL queries to aggregate data
- Performs calculations defined in schema
- Returns computed results

**Table Sections** (`project_portfolio.php`):
- Supports filtering (from schema `filters`)
- Supports sorting (from schema `columns.sortable`)
- Supports pagination
- Applies column definitions from schema

All endpoints include:
- CORS headers (echo origin pattern)
- Authentication check (uses `auth_token_amdp`)
- Database connection to AMDP
- Error handling
- JSON responses

## Key Differences from Traditional Approach

### Validation

**Traditional** (scattered):
```php
// In model
if ($cost < 0) $errors[] = "Invalid cost";

// In API
if (!isset($_POST['cost']) || $_POST['cost'] < 0) ...

// In frontend
if (cost < 0) showError(...);
```

**Document-First** (defined once):
```yaml
fields:
  - name: estimated_cost
    min: 0
    required: true
```

Generates validation in:
- Database (CHECK constraint)
- PHP model (validate() method)
- API (input validation)
- (Future) Frontend (form validation)

### Calculated Fields

**Traditional** (manual code):
```php
public function getExecutiveSummary() {
    $total = 0;
    foreach ($this->projects as $p) {
        $total += $p->cost;
    }
    // ... more manual calculations
}
```

**Document-First** (declarative):
```yaml
fields:
  - name: total_program_value
    calculation: "SUM(projects.estimated_cost)"
```

Generator creates optimized SQL query.

### API Structure

**Traditional** (entity-centric):
```
GET /api/projects
GET /api/risks
GET /api/assets
```

**Document-First** (section-centric):
```
GET /api/capital-works-program/{fy}/executive-summary
GET /api/capital-works-program/{fy}/project-portfolio
GET /api/capital-works-program/{fy}/risk-register
```

APIs mirror the document structure stakeholders understand.

## The Power of This Approach

### 1. Single Source of Truth

Change the schema YAML, regenerate, and:
- Database schema updates
- Entity validations update
- API logic updates
- (Future) UI components update
- Documentation updates

All automatically. No manual synchronization needed.

### 2. Business Alignment

Stakeholders can review the schema:
```yaml
sections:
  - id: executive_summary
    fields:
      - name: total_program_value
        label: "Total Program Value"
```

They understand "Executive Summary with Total Program Value". They don't understand "SELECT SUM(estimated_cost) FROM projects".

### 3. Completeness Forcing

You can't skip fields. If the schema says "Executive Summary needs funding_breakdown", the generator creates the calculation. You can't forget it.

### 4. Testability

Schema validation rules become test cases automatically:
```yaml
validations:
  - rule: "SUM(projects.estimated_cost) <= budget.capital_allocation"
```

Generates test:
```php
function test_budget_constraint() {
    // Create projects totaling $10M
    // Create budget of $9M
    // Assert: validation fails
}
```

### 5. Rapid Iteration

**Add a new section to the document?**

1. Add section definition to YAML (5 minutes)
2. Run generator (5 seconds)
3. Deploy (1 minute)

Total: ~7 minutes

Traditional approach: Hours or days of coding, testing, debugging.

### 6. Documentation IS Specification

The YAML schema is:
- The specification
- The documentation
- The source code generator input

They can't diverge because they're the same file.

## Example: Adding a New Document Section

### Requirement

"We need a new section showing which projects are behind schedule."

### Traditional Approach

1. Write SQL query to find late projects
2. Create new PHP method in document class
3. Create new API endpoint
4. Add frontend component
5. Write tests
6. Update documentation

**Estimated time**: 4-8 hours

### Document-First Approach

1. Edit schema YAML:

```yaml
sections:
  - id: schedule_status
    label: "Schedule Status"
    type: table
    data_source: "
      SELECT
        p.*,
        DATEDIFF(NOW(), p.completion_date) as days_overdue
      FROM projects p
      WHERE p.status = 'In Progress'
        AND p.completion_date < NOW()
    "
    columns:
      - field: project_id
        label: "Project"
      - field: days_overdue
        label: "Days Overdue"
        type: integer
        color_scale:
          min: 0
          max: 90
          low_color: yellow
          high_color: red
```

2. Run generator:
```bash
php generate.php
```

3. Deploy:
```bash
cp generated/api/schedule_status.php /path/to/api/
```

**Estimated time**: 10 minutes

Result:
- ✅ New API endpoint: `GET /api/capital-works-program/{fy}/schedule-status`
- ✅ Color-coded days overdue
- ✅ Filterable/sortable table
- ✅ Automatically integrated with document

## Running the System

### Prerequisites

- Docker setup with PHP and MySQL
- AMDP database created
- jwt_secret_amdp configured

### Generate Code

```bash
# From inside Docker PHP container
cd /var/www/capital-works-program/document-first
php generate.php
```

Or:
```bash
docker exec -it php-api-container php /var/www/capital-works-program/document-first/generate.php
```

### Deploy Generated Files

```bash
# 1. Database
mysql -u app_user -p AMDP < document-first/generated/database/003_capital_works_generated.sql

# 2. PHP Models
cp document-first/generated/models/*.php /path/to/php-api/src/CapitalWorks/

# 3. API Endpoints
mkdir -p /path/to/php-api/public/api/capital-works-program
cp document-first/generated/api/*.php /path/to/php-api/public/api/capital-works-program/
```

### Test APIs

```bash
# Executive Summary
curl "https://lynkfs.com/api/capital-works-program/executive_summary.php?fy=2025/26" \
  -H "Cookie: auth_token_amdp=YOUR_TOKEN"

# Project Portfolio (with filtering)
curl "https://lynkfs.com/api/capital-works-program/project_portfolio.php?fy=2025/26&filter[category]=Roads" \
  -H "Cookie: auth_token_amdp=YOUR_TOKEN"
```

## Future Enhancements

This is a working proof-of-concept. Production system would add:

1. **Frontend Generation**: Generate React/Vue components from section definitions
2. **Full YAML Parser**: Use symfony/yaml for complete YAML support
3. **Named Query Integration**: Generate named_query definitions
4. **Test Generation**: Auto-generate PHPUnit tests from validation rules
5. **OpenAPI Spec**: Generate Swagger/OpenAPI documentation from schema
6. **Migration Versioning**: Track schema versions and generate diffs
7. **UI Theme Support**: Different visual themes from same schema
8. **Export Formats**: PDF, Excel generation from document schema

## Philosophy

This system embodies the core principle:

> **Start with the information stakeholders need (documents),**
> **not with the data you think you need to store (entities).**

Documents are:
- What users understand
- What delivers business value
- What encode business rules
- What provide natural validation
- What define scope clearly

By making the document schema the source of truth, we ensure the system delivers exactly what's needed, nothing more, nothing less.

---

**Document First, Code Second**
*From specification to working system in minutes, not days*
