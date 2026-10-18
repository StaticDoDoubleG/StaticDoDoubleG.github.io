# 실습 코드 기록과 확인 지점

이 문서는 짧은 답안을 외우기 위한 목록이 아니라, 각 notebook에서 수식의 어느 부분을 코드로 옮기는지 추적하기 위한 기록이다. 같은 함수라도 단일 샘플인지 batch인지에 따라 shape와 평균 방식이 달라진다.

## 1. 퍼셉트론 notebook

### 계산 순서

```python
x = np.array([x1, x2])
tmp = np.sum(w * x) + b
return 0 if tmp <= 0 else 1
```

`w * x`는 원소별 곱이고 `np.sum`이 이를 더해 내적 $w_1x_1+w_2x_2$를 만든다. `b`는 결정 경계를 평행 이동한다. 이 구현에서는 `tmp == 0`을 1이 아니라 0으로 처리하므로, 자료의 가중치와 편향을 바꿀 때도 경계의 결과를 확인한다.

### 게이트 값의 의미

```python
AND:  w = np.array([0.5, 0.5]);   b = -0.7
NAND: w = np.array([-0.5, -0.5]); b = 0.7
OR:   w = np.array([0.5, 0.5]);   b = -0.3
```

AND의 `(1,1)`은 `0.5 + 0.5 - 0.7 = 0.3`으로 양수이고, `(1,0)`은 `-0.2`로 음수다. OR에서는 bias를 덜 낮춰 `(1,0)`도 `0.2`가 되게 한다. `b`는 임의의 상수가 아니라 뉴런이 켜지는 임계값을 결정하는 항이다.

### XOR의 중간값

```python
s1 = NAND(x1, x2)
s2 = OR(x1, x2)
y = AND(s1, s2)
```

| `(x1, x2)` | `NAND` | `OR` | 최종 `AND` |
|---|---:|---:|---:|
| `(0, 0)` | 1 | 0 | 0 |
| `(1, 0)` | 1 | 1 | 1 |
| `(0, 1)` | 1 | 1 | 1 |
| `(1, 1)` | 0 | 1 | 0 |

XOR를 하나의 새 가중치로 만들지 않는다. 첫 층이 입력 공간을 나누고, 다음 퍼셉트론이 중간 출력 조합을 다시 판정한다.

## 2. 선형회귀 notebook

### 데이터와 목표값

```python
x_train = torch.FloatTensor([[1], [2], [3]])
y_train = torch.FloatTensor([[5], [2], [-1]])
```

세 쌍은 $y=-3x+8$에 정확히 놓인다. 따라서 학습이 충분히 진행된 뒤 `W`는 -3, `b`는 8 근처여야 한다. 초기값에서 바로 정답이 나오는 것이 아니라 loss의 gradient를 통해 직선의 기울기와 절편을 반복해서 이동시킨다.

### 한 iteration의 의미

```python
hypothesis = x_train * W + b
cost = torch.mean((hypothesis - y_train) ** 2)

optimizer.zero_grad()
cost.backward()
optimizer.step()
```

1. `hypothesis`: 현재 직선으로 세 입력을 예측한다.
2. `cost`: 예측 오차의 제곱 평균을 계산한다.
3. `zero_grad`: 이전 iteration의 `W.grad`, `b.grad`를 지운다.
4. `backward`: MSE의 $W,b$ 편미분을 계산한다.
5. `step`: gradient의 반대 방향으로 파라미터를 갱신한다.

`requires_grad=True`가 빠지면 `W`와 `b`가 자동미분 대상으로 추적되지 않는다. `zero_grad`를 반복문 밖에 두면 gradient가 iteration 사이에 누적되어 현재 loss만 반영하지 않게 된다.

## 3. NumPy 활성화 함수

```python
def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def relu(x):
    return np.maximum(0, x)

def leaky_relu(x, a=0.1):
    return np.maximum(a * x, x)
```

`np.maximum(0, x)`는 각 원소를 비교한다. `np.max(x)`로 바꾸면 배열 전체에서 가장 큰 값 하나만 남아 shape가 무너진다. `x=[-1,0,1,2]`일 때 ReLU는 `[0,0,1,2]`, Leaky ReLU는 `[-0.1,0,1,2]`다.

### Softmax 구현

```python
def softmax(a):
    c = np.max(a)
    exp_a = np.exp(a - c)
    return exp_a / np.sum(exp_a)
```

`a=[1010,1000,990]`처럼 큰 값에 바로 `np.exp`를 적용하면 overflow가 날 수 있다. $c=\max(a)$를 빼면 지수의 입력이 0 이하가 되고, 분자·분모의 공통 $e^{-c}$는 약분되므로 결과는 변하지 않는다.

## 4. Loss notebook

```python
def mse_single(y_hat, y):
    return np.mean((y_hat - y) ** 2)

def cce_single(y_hat, y):
    return -np.sum(y * np.log(y_hat + delta))

def bce_single(y_hat, y):
    return -(y * np.log(y_hat + delta)
             + (1 - y) * np.log(1 - y_hat + delta))
```

`delta=1e-7`은 `log(0)`을 피하기 위한 값이다. `np.log(y_hat) + delta`는 이미 `log(0)=-inf`를 계산한 뒤이므로 목적을 달성하지 못한다. 반드시 `np.log(y_hat + delta)`처럼 log의 입력에 더한다.

CCE batch 입력이 `(B, C)`라면 전체 합을 class count가 아니라 batch size로 나눈다.

```python
def cce_batch(y_hat, y):
    batch_size = y_hat.shape[0]
    return -np.sum(y * np.log(y_hat + delta)) / batch_size
```

BCE는 샘플당 scalar 하나가 나오므로 `-np.mean(...)`도 batch 평균과 같다. CCE는 한 샘플 안에 여러 클래스 항이 있으므로 샘플별 합을 먼저 만들고 batch size로 나눈다.

## 5. MNIST notebook

이미지 batch의 shape은 `(B, 1, 28, 28)`이고 `Flatten` 뒤에는 `(B, 784)`가 된다. 마지막 `Linear`의 출력은 10개 logits다.

```python
model = nn.Sequential(
    nn.Flatten(),
    nn.Linear(784, 512), nn.ReLU(),
    nn.Linear(512, 128), nn.ReLU(),
    nn.Linear(128, 32), nn.ReLU(),
    nn.Linear(32, 10),
)
criterion = nn.CrossEntropyLoss()
```

`CrossEntropyLoss`가 내부에서 log-softmax를 처리하므로 모델 끝에 Softmax를 추가하지 않는다. 예측 클래스만 필요할 때는 `logits.argmax(dim=1)`을 사용한다. Softmax는 각 값의 순서를 바꾸지 않으므로 argmax 결과가 같다.

## 6. 실행 결과 기록

1. notebook을 위에서부터 실행하고 TODO와 `...`가 남아 있는지 확인한다.
2. 퍼셉트론에서 AND, NAND, OR, XOR 진리표를 직접 확인한다.
3. 선형회귀에서 cost가 감소하고 `W≈-3`, `b≈8`인지 확인한다.
4. loss notebook에서 단일/배치 CCE와 BCE의 기준값을 비교한다.
5. MNIST에서 `model.train()`과 `model.eval()`을 구분하고 전체 test accuracy를 기록한다.
6. 오류가 나면 정답 코드를 다시 붙이기 전에 입력 shape, dtype, device, gradient 존재 여부를 확인한다.

실행 결과에는 단순히 “통과”만 남기지 않는다. 사용한 epoch, batch size, learning rate, optimizer, 모델 구조, device, 기준 metric을 함께 기록해야 다른 실행과 비교할 수 있다.
