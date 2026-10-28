/**
 * Curated C Code Examples showcasing C language grammar features
 */

export const C_SAMPLES = {
  fibonacci: {
    name: 'Recursive Fibonacci',
    description: 'Demonstrates function definitions, recursion, conditional operators, and console I/O.',
    code: `#include <stdio.h>

// Computes the nth Fibonacci number recursively
int fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main(void) {
    int n = 8;
    int result = fibonacci(n);
    printf("Fibonacci(%d) = %d\\n", n, result);
    return 0;
}
`
  },

  linked_list: {
    name: 'Linked List & Structs',
    description: 'Demonstrates typedef, struct declarations, pointer member access (->), and while loops.',
    code: `#include <stdio.h>
#include <stdlib.h>

// Self-referential linked list node
typedef struct Node {
    int data;
    struct Node* next;
} Node;

// Traverses list and sums values
int sum_list(Node* head) {
    int sum = 0;
    Node* current = head;

    while (current != NULL) {
        sum += current->data;
        current = current->next;
    }

    return sum;
}

int main() {
    Node third = {30, NULL};
    Node second = {20, &third};
    Node first = {10, &second};

    int total = sum_list(&first);
    printf("Sum of nodes: %d\\n", total);
    return 0;
}
`
  },

  precedence: {
    name: 'Operator Precedence & Pratt Expressions',
    description: 'Exercises arithmetic, bitwise shifts, comparisons, logical conjunctions, and ternary operators.',
    code: `#include <stdio.h>

int evaluate_formula(int a, int b, int c, int d) {
    // Tests precedence: multiplicative > additive > shift > relational > equality > bitwise > logical
    int x = a + b * c - (d / 2);
    int y = (a << 2) | (b & 0xFF);
    int flag = (x >= 50 && y != 0) ? x * 2 : y + 10;

    return flag;
}

int main() {
    int res = evaluate_formula(10, 5, 4, 8);
    printf("Result: %d\\n", res);
    return 0;
}
`
  },

  control_flow: {
    name: 'Control Flow (Loops & Switch)',
    description: 'Tests for-loops, while-loops, switch-case statements, break, and compound blocks.',
    code: `#include <stdio.h>

int classify_score(int score) {
    int category = 0;

    if (score >= 90) {
        category = 1; // Excellent
    } else if (score >= 75) {
        category = 2; // Good
    } else {
        category = 3; // Needs work
    }

    switch (category) {
        case 1:
            printf("Rank: Grade A\\n");
            break;
        case 2:
            printf("Rank: Grade B\\n");
            break;
        default:
            printf("Rank: Grade C\\n");
            break;
    }

    for (int i = 0; i < category; i++) {
        score += 2;
    }

    return score;
}
`
  },

  syntax_error: {
    name: 'Syntax Error & Recovery Showcase',
    description: 'Contains deliberate syntax errors (missing semicolon, unclosed paren) to showcase graceful recovery and diagnostics.',
    code: `#include <stdio.h>

int calculate(int x, int y) {
    // Missing semicolon below:
    int result = x * y + 10
    
    // Mismatched parenthesis:
    if (result > 50 {
        return result * 2;
    }
    
    return result;
}

int main() {
    int val = calculate(5, 8);
    printf("Value: %d\\n", val);
    return 0;
}
`
  }
};
