# 손실 함수와 출력층

## 1. 손실의 역할
손실은 예측과 정답의 차이를 학습 가능한 하나의 값으로 만든다. 회귀는 MSE, 이진 분류는 Sigmoid+BCE, 다중 분류는 Softmax+CCE 조합이 대표적이다.

$$\mathrm{MSE}=\frac1n\sum_i(\hat y_i-y_i)^2$$

큰 오차를 제곱해 더 강하게 벌점하므로 연속값 예측에 적합하다.

## 2. Entropy, KL, Cross Entropy
정보량은 $-\log p(x)$, 엔트로피는
$$H(p)=-\sum_xp(x)\log p(x)$$
이다. 실제 분포 $p$와 예측 분포 $q$에 대해
$$D_{KL}(p\|q)=\sum_xp(x)\log\frac{p(x)}{q(x)}=CE(p,q)-H(p)$$
이고 $H(p)$는 모델 최적화에서 상수이므로 Cross Entropy를 최소화한다.

## 3. BCE와 CCE
이진 분류에서
$$BCE=-[y\log p+(1-y)\log(1-p)]$$
이다. 다중 분류에서 원-핫 정답 $y_k$와 예측 확률 $\hat y_k$는
$$CCE=-\sum_k y_k\log\hat y_k=-\log(\text{정답 클래스 확률})$$
로 계산된다. 정답 확률이 0.8이면 손실은 약 0.223이고, 0.1이면 약 2.303이다.

```python
delta = 1e-7
def cce_single(y_hat, y):
    return -np.sum(y * np.log(y_hat + delta))
def bce_single(y_hat, y):
    return -(y*np.log(y_hat+delta) + (1-y)*np.log(1-y_hat+delta))
```
`delta`는 반드시 로그의 입력 안에 넣는다. `log(0)=-inf` 및 `0*(-inf)=nan`을 막기 위해서다.

## 4. 배치 손실
CCE 입력이 `(batch_size, class_count)`이면 전체 합을 class count가 아니라 batch size로 나눈다.
```python
return -np.sum(y * np.log(y_hat + delta)) / y_hat.shape[0]
```
BCE는 샘플당 값 하나이므로 `-np.mean(...)`도 같은 배치 평균을 준다.

## 5. 지식 증류
Teacher의 soft probability 분포를 Student가 모방하도록 KL divergence를 손실에 추가하면, hard label만으로는 전달되지 않는 클래스 간 유사도와 불확실성까지 학습시킬 수 있다.

## 6. 손실 함수의 입력과 출력 shape

손실 함수 이름만 보고 조합하지 말고, 모델 출력의 의미와 shape를 먼저 맞춘다.

| 문제 | 모델 출력 | 정답 | 대표 손실 |
|---|---|---|---|
| 회귀 | `(B, 1)` 또는 연속값 | 같은 shape의 실수 | MSE |
| 이진 분류 | `(B,)` 또는 `(B,1)`의 확률/로그릿 | 0 또는 1 | BCE 계열 |
| 다중 분류 | `(B, C)`의 logits | `(B,)` 정수 index | Cross Entropy |

다중 분류에서 정답이 `[7, 2, 0]`처럼 정수 index로 주어지면 `CrossEntropyLoss`는 각 행에서 해당 index의 log-probability만 손실에 반영한다. 원-핫 `[0,0,0,0,0,0,0,1,0,0]`을 그대로 넣는 방식과는 API가 다르므로 정답의 표현을 확인해야 한다.

## 7. MSE가 분류 손실로 부적합한 이유

분류 결과를 0과 1로 숫자화하고 MSE를 사용할 수도 있지만, 확률 예측의 의미를 직접 반영하지 못한다. 정답 클래스에 0.1을 준 예측과 0.4를 준 예측의 차이를 cross entropy는 `-log(p)`로 평가한다. 정답 확률이 0에 가까울수록 손실이 급격히 커지므로, 확신을 가지고 틀린 예측에 큰 벌점을 준다.

## 8. `delta`와 수치 경계

```python
delta = 1e-7
loss = -np.sum(y * np.log(y_hat + delta))
```

확률 계산 결과는 부동소수점 오차로 0 또는 1을 정확히 벗어날 수 있다. `log(0)`은 `-inf`이고, 이후 gradient에 `nan`이 섞이면 optimizer 업데이트 전체가 망가질 수 있다. `delta`는 이 문제를 완화하지만, 너무 큰 값을 더하면 손실값 자체가 바뀐다. 따라서 자료의 `1e-7`처럼 작은 값을 사용하고, `log` 바깥이 아닌 확률 입력에 더한다.

## 9. CCE batch 평균의 기준

샘플별 CCE를
$$L_i=-\sum_{k=1}^Cy_{ik}\log \hat y_{ik}$$
라고 하면 batch loss는
$$L_{batch}=\frac1B\sum_{i=1}^BL_i$$
이다. 코드로는 전체 클래스 항을 먼저 합한 뒤 $B$로 나눈다. 전체 원소 수 $BC$로 나누면 샘플당 클래스 평균이 되어 정의가 달라진다.

## 10. 출력층을 확인하는 순서

1. 출력이 연속값인지, 확률인지, logits인지 구분한다.
2. 마지막 층의 차원이 문제의 출력 수와 맞는지 확인한다.
3. loss가 요구하는 정답 shape와 dtype을 확인한다.
4. loss 내부에 sigmoid/softmax가 포함되어 있는지 확인한다.
5. 학습 중에는 loss 감소를, 평가에서는 적절한 metric 개선을 따로 기록한다.
