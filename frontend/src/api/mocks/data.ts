import type {
  ChatAnswer,
  DemoRepo,
  FileContent,
  FileInfo,
  Graph,
  Hotspot,
  Impact,
  Overview,
  Relations,
  Repo,
  Symbol,
  Validation,
} from '../types'

export const mockRepos: Record<number, Repo> = {
  1: {
    id: 1,
    url: 'https://github.com/demo/shop-app',
    owner: 'demo',
    name: 'shop-app',
    status: 'ready',
    error_message: null,
  },
  2: {
    id: 2,
    url: 'https://github.com/demo/slow-repo',
    owner: 'demo',
    name: 'slow-repo',
    status: 'queued',
    error_message: null,
  },
  3: {
    id: 3,
    url: 'https://github.com/demo/private-thing',
    owner: 'demo',
    name: 'private-thing',
    status: 'error',
    error_message: 'This project is private or does not exist.',
  },
}

export const mockDemoRepos: DemoRepo[] = [
  {
    name: 'shop-app',
    url: 'https://github.com/demo/shop-app',
    description: 'An online store backend with cart, payments, and order processing.',
  },
  {
    name: 'flask-starter',
    url: 'https://github.com/demo/flask-starter',
    description: 'A modular microservice architecture with auth and telemetry.',
  },
  {
    name: 'slow-repo',
    url: 'https://github.com/demo/slow-repo',
    description: 'A larger codebase to demonstrate real-time ingestion progress.',
  },
]

export const mockOverview: Overview = {
  repo: mockRepos[1],
  files: 5,
  functions: 14,
  classes: 4,
  calls: 22,
  uncertain_calls: 5,
  commits: 50,
  skipped_files: 0,
}

export const mockFiles: FileInfo[] = [
  { path: 'shop/cart.py', line_count: 120 },
  { path: 'shop/payment.py', line_count: 80 },
  { path: 'shop/orders.py', line_count: 150 },
  { path: 'shop/utils.py', line_count: 60 },
  { path: 'api/routes.py', line_count: 90 },
]

export const mockFileContents: Record<string, FileContent> = {
  'shop/payment.py': {
    path: 'shop/payment.py',
    line_count: 80,
    content: `"""Payment processing service for shop application."""
import logging
from shop.utils import format_money

logger = logging.getLogger(__name__)


def charge_card(customer_id: str, amount_cents: int, currency: str = "USD") -> bool:
    """Charge a customer's credit card via gateway provider."""
    formatted = format_money(amount_cents)
    logger.info(f"Initiating charge of {formatted} for customer {customer_id}")
    
    if amount_cents <= 0:
        logger.error("Invalid transaction amount")
        return False
        
    try:
        # Simulate gateway network request
        token = retrieve_customer_token(customer_id)
        if not token:
            return False
            
        success = execute_remote_charge(token, amount_cents, currency)
        if success:
            logger.info("Payment settled successfully")
            return True
        return False
    except Exception as exc:
        logger.error(f"Gateway failure: {exc}")
        return False


def retrieve_customer_token(customer_id: str) -> str:
    return f"tok_{customer_id}_sec"


def execute_remote_charge(token: str, amount: int, currency: str) -> bool:
    return True
`,
  },
  'shop/cart.py': {
    path: 'shop/cart.py',
    line_count: 120,
    content: `"""Shopping cart and line item calculation."""
from shop.utils import format_money


def add_item(cart: dict, item_id: str, quantity: int = 1) -> dict:
    cart.setdefault("items", {})
    cart["items"][item_id] = cart["items"].get(item_id, 0) + quantity
    return cart


def calculate_total(cart: dict, prices: dict) -> int:
    total = 0
    for item_id, count in cart.get("items", {}).items():
        price = prices.get(item_id, 0)
        total += price * count
    return total
`,
  },
  'shop/orders.py': {
    path: 'shop/orders.py',
    line_count: 150,
    content: `"""Order creation and lifecycle dispatching."""
from shop.cart import calculate_total
from shop.payment import charge_card
from shop.utils import format_money


def create_order(customer_id: str, cart: dict, prices: dict) -> dict:
    total = calculate_total(cart, prices)
    paid = charge_card(customer_id, total)
    if not paid:
        raise ValueError("Payment rejected")
    send_receipt(customer_id, total)
    return {"status": "confirmed", "total": total}


def send_receipt(customer_id: str, amount_cents: int) -> bool:
    text = format_money(amount_cents)
    print(f"Receipt sent to {customer_id} for {text}")
    return True
`,
  },
  'shop/utils.py': {
    path: 'shop/utils.py',
    line_count: 60,
    content: `"""Formatting and common helpers."""


def format_money(cents: int) -> str:
    dollars = cents / 100.0
    return f"\${dollars:,.2f}"
`,
  },
  'api/routes.py': {
    path: 'api/routes.py',
    line_count: 90,
    content: `"""HTTP API Routes for shopping frontend."""
from shop.cart import add_item
from shop.orders import create_order


def checkout(customer_id: str, cart: dict, prices: dict) -> dict:
    if not cart.get("items"):
        add_item(cart, "default_item", 1)
    return create_order(customer_id, cart, prices)
`,
  },
}

export const mockSymbols: Symbol[] = [
  {
    id: 1,
    file_path: 'shop/cart.py',
    name: 'add_item',
    qualified_name: 'shop.cart.add_item',
    kind: 'function',
    start_line: 5,
    end_line: 8,
  },
  {
    id: 2,
    file_path: 'shop/cart.py',
    name: 'calculate_total',
    qualified_name: 'shop.cart.calculate_total',
    kind: 'function',
    start_line: 11,
    end_line: 16,
  },
  {
    id: 3,
    file_path: 'shop/payment.py',
    name: 'charge_card',
    qualified_name: 'shop.payment.charge_card',
    kind: 'function',
    start_line: 8,
    end_line: 29,
  },
  {
    id: 4,
    file_path: 'shop/orders.py',
    name: 'create_order',
    qualified_name: 'shop.orders.create_order',
    kind: 'function',
    start_line: 7,
    end_line: 14,
  },
  {
    id: 5,
    file_path: 'shop/orders.py',
    name: 'send_receipt',
    qualified_name: 'shop.orders.send_receipt',
    kind: 'function',
    start_line: 17,
    end_line: 21,
  },
  {
    id: 6,
    file_path: 'shop/utils.py',
    name: 'format_money',
    qualified_name: 'shop.utils.format_money',
    kind: 'function',
    start_line: 4,
    end_line: 6,
  },
  {
    id: 7,
    file_path: 'api/routes.py',
    name: 'checkout',
    qualified_name: 'api.routes.checkout',
    kind: 'function',
    start_line: 6,
    end_line: 10,
  },
]

export const mockRelations: Record<number, Relations> = {
  3: {
    // charge_card
    callers: [
      {
        ...mockSymbols[3], // create_order
        certainty: 'certain',
        call_line: 9,
      },
    ],
    callees: [
      {
        ...mockSymbols[5], // format_money
        certainty: 'certain',
        call_line: 10,
      },
    ],
  },
  4: {
    // create_order
    callers: [
      {
        ...mockSymbols[6], // checkout
        certainty: 'certain',
        call_line: 9,
      },
    ],
    callees: [
      {
        ...mockSymbols[1], // calculate_total
        certainty: 'certain',
        call_line: 8,
      },
      {
        ...mockSymbols[2], // charge_card
        certainty: 'certain',
        call_line: 9,
      },
      {
        ...mockSymbols[4], // send_receipt
        certainty: 'certain',
        call_line: 12,
      },
    ],
  },
}

export const mockHotspots: Hotspot[] = [
  { path: 'shop/orders.py', changes: 42, connections: 6, score: 0.94 },
  { path: 'shop/payment.py', changes: 31, connections: 4, score: 0.78 },
  { path: 'shop/cart.py', changes: 27, connections: 5, score: 0.65 },
  { path: 'api/routes.py', changes: 18, connections: 3, score: 0.44 },
  { path: 'shop/utils.py', changes: 9, connections: 8, score: 0.28 },
]

export const mockImpactChargeCard: Impact = {
  target: mockSymbols[2], // charge_card
  depth: 2,
  items: [
    {
      symbol_id: 4,
      name: 'create_order',
      file_path: 'shop/orders.py',
      start_line: 7,
      depth: 1,
      score: 0.86,
      level: 'high',
      reason: 'Calls this directly and changed together in 14 of 50 commits.',
    },
    {
      symbol_id: 7,
      name: 'checkout',
      file_path: 'api/routes.py',
      start_line: 6,
      depth: 2,
      score: 0.47,
      level: 'medium',
      reason: 'Reaches this through create_order and changed together in 6 of 50 commits.',
    },
    {
      symbol_id: 5,
      name: 'send_receipt',
      file_path: 'shop/orders.py',
      start_line: 17,
      depth: 2,
      score: 0.21,
      level: 'low',
      reason: 'Same file as create_order but no recorded changes together.',
    },
  ],
}

export const mockGraphCallView: Graph = {
  nodes: [
    { id: '1', label: 'add_item', kind: 'function', file_path: 'shop/cart.py' },
    { id: '2', label: 'calculate_total', kind: 'function', file_path: 'shop/cart.py' },
    { id: '3', label: 'charge_card', kind: 'function', file_path: 'shop/payment.py' },
    { id: '4', label: 'create_order', kind: 'function', file_path: 'shop/orders.py' },
    { id: '5', label: 'send_receipt', kind: 'function', file_path: 'shop/orders.py' },
    { id: '6', label: 'format_money', kind: 'function', file_path: 'shop/utils.py' },
    { id: '7', label: 'checkout', kind: 'function', file_path: 'api/routes.py' },
  ],
  edges: [
    { source: '7', target: '4', certainty: 'certain' },
    { source: '4', target: '2', certainty: 'certain' },
    { source: '4', target: '3', certainty: 'certain' },
    { source: '4', target: '5', certainty: 'certain' },
    { source: '2', target: '6', certainty: 'certain' },
    { source: '5', target: '6', certainty: 'uncertain' },
    { source: '7', target: '1', certainty: 'uncertain' },
  ],
  total_nodes: 7,
  truncated: false,
}

export const mockGraphModuleView: Graph = {
  nodes: [
    { id: 'm1', label: 'shop/cart.py', kind: 'module', file_path: 'shop/cart.py' },
    { id: 'm2', label: 'shop/payment.py', kind: 'module', file_path: 'shop/payment.py' },
    { id: 'm3', label: 'shop/orders.py', kind: 'module', file_path: 'shop/orders.py' },
    { id: 'm4', label: 'shop/utils.py', kind: 'module', file_path: 'shop/utils.py' },
    { id: 'm5', label: 'api/routes.py', kind: 'module', file_path: 'api/routes.py' },
  ],
  edges: [
    { source: 'm5', target: 'm3', certainty: 'certain' },
    { source: 'm5', target: 'm1', certainty: 'uncertain' },
    { source: 'm3', target: 'm1', certainty: 'certain' },
    { source: 'm3', target: 'm2', certainty: 'certain' },
    { source: 'm1', target: 'm4', certainty: 'certain' },
    { source: 'm3', target: 'm4', certainty: 'uncertain' },
  ],
  total_nodes: 5,
  truncated: false,
}

export const mockLargeGraph: Graph = {
  nodes: Array.from({ length: 400 }, (_, i) => ({
    id: `node_${i}`,
    label: `func_${i}`,
    kind: 'function',
    file_path: `pkg/mod_${Math.floor(i / 10)}.py`,
  })),
  edges: Array.from({ length: 390 }, (_, i) => ({
    source: `node_${i}`,
    target: `node_${i + 1}`,
    certainty: i % 4 === 0 ? 'uncertain' : 'certain',
  })),
  total_nodes: 400,
  truncated: true,
}

export const mockChatAnswer: ChatAnswer = {
  answer:
    'Payments are handled by charge_card, which create_order calls when an order is placed.',
  sources: [
    { file: 'shop/payment.py', start_line: 8, end_line: 29, verified: true },
    { file: 'shop/orders.py', start_line: 7, end_line: 14, verified: true },
    { file: 'shop/old.py', start_line: 1, end_line: 10, verified: false },
  ],
  cached: false,
}

export const mockValidation: Validation = {
  status: 'done',
  runs: [
    { variant: 'combined', k: 5, commits_tested: 50, precision: 0.62, recall: 0.48 },
    { variant: 'history', k: 5, commits_tested: 50, precision: 0.55, recall: 0.41 },
    { variant: 'graph', k: 5, commits_tested: 50, precision: 0.38, recall: 0.29 },
    { variant: 'combined', k: 10, commits_tested: 50, precision: 0.58, recall: 0.64 },
    { variant: 'history', k: 10, commits_tested: 50, precision: 0.49, recall: 0.57 },
    { variant: 'graph', k: 10, commits_tested: 50, precision: 0.32, recall: 0.42 },
  ],
  commits: [
    {
      sha: 'a1b2c3d',
      message: 'Refactor checkout order lifecycle dispatch',
      actual: ['api/routes.py', 'shop/orders.py', 'shop/payment.py'],
      predicted: {
        combined: ['shop/orders.py', 'shop/payment.py', 'shop/cart.py'],
        history: ['shop/orders.py', 'shop/payment.py', 'shop/utils.py'],
        graph: ['shop/orders.py', 'shop/cart.py', 'shop/utils.py'],
      },
    },
    {
      sha: 'e4f5a6b',
      message: 'Add currency formatting for international checkout',
      actual: ['shop/utils.py', 'shop/payment.py'],
      predicted: {
        combined: ['shop/utils.py', 'shop/payment.py'],
        history: ['shop/payment.py', 'shop/orders.py'],
        graph: ['shop/utils.py', 'shop/cart.py'],
      },
    },
    {
      sha: 'c7d8e9f',
      message: 'Fix quantity tally calculation in cart items',
      actual: ['shop/cart.py'],
      predicted: {
        combined: ['shop/cart.py', 'shop/orders.py'],
        history: ['shop/cart.py', 'shop/orders.py'],
        graph: ['shop/cart.py', 'shop/utils.py'],
      },
    },
    {
      sha: '9a8b7c6',
      message: 'Enhance payment error logging and retry policy',
      actual: ['shop/payment.py', 'shop/orders.py'],
      predicted: {
        combined: ['shop/payment.py', 'shop/orders.py'],
        history: ['shop/payment.py', 'shop/orders.py'],
        graph: ['shop/orders.py', 'shop/utils.py'],
      },
    },
  ],
}

